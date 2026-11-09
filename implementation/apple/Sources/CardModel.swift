import Foundation

// What a playing card looks like, as data: the pure part of the card drawing, matching
// web/card-model.ts. A card code is a rank (2-9, T, J, Q, K, A) then a suit (c, d, h, s), such as
// "Ah" or "Td". nil is a card face down.
enum BackStyle: String, CaseIterable { case stripes, plain, art }
enum CornerStyle: String, CaseIterable { case rounded, soft, square }

struct CardSettings: Equatable {
    var backStyle: BackStyle = .stripes
    var cornerStyle: CornerStyle = .rounded
    var cardWidth: Double = 56

    // nil when the width is outside 8 to 600.
    var isValid: Bool { cardWidth.isFinite && cardWidth >= 8 && cardWidth <= 600 }
}

struct ParsedCard: Equatable {
    let rank: Character
    let suit: Character
    var red: Bool { suit == "h" || suit == "d" }
}

struct CardPip: Equatable {
    let x: Double, y: Double
    let flip: Bool, small: Bool
}

enum CardCentre: Equatable {
    case court(art: String)
    case ace(pip: String)
    case pips([CardPip])
    case rank(String)
}

enum FaceModel: Equatable {
    case back(art: String?)
    case face(red: Bool, rank: Character, rankText: String, pip: String, ten: Bool, centre: CardCentre)
}

enum CardModel {
    static let aspect = 1.4
    static let ranks = Array("23456789TJQKA")
    static let suits = Array("cdhs")

    static func parse(_ code: String?) -> ParsedCard? {
        guard let code, code.count == 2, let rank = code.first, let suit = code.last, ranks.contains(rank), suits.contains(suit) else { return nil }
        return ParsedCard(rank: rank, suit: suit)
    }

    static func allCards() -> [String] { ranks.flatMap { r in suits.map { s in String(r) + String(s) } } }

    static func suitGlyph(_ suit: Character) -> String {
        switch suit {
        case "c": return "\u{2663}"
        case "d": return "\u{2666}"
        case "h": return "\u{2665}"
        default: return "\u{2660}"
        }
    }

    static func courtName(_ rank: Character) -> String? {
        switch rank {
        case "J": return "jack"
        case "Q": return "queen"
        case "K": return "king"
        default: return nil
        }
    }

    // The fraction of the card's width used as the corner radius.
    static func cornerRadius(_ style: CornerStyle) -> Double {
        switch style {
        case .rounded: return 0.08
        case .soft: return 0.14
        case .square: return 0.02
        }
    }

    // Pip positions inside the central box as fractions of its width and height, for 2 to 10 (T).
    // The lower half is printed upside down, as on a real card.
    private static let colL = 0.2, colC = 0.5, colR = 0.8
    private static let rows4 = [0.13, 0.38, 0.62, 0.87]
    private static let rows3 = [0.13, 0.5, 0.87]
    private static func sides(_ rows: [Double]) -> [(Double, Double)] { rows.flatMap { [(colL, $0), (colR, $0)] } }
    static let pips: [Character: [(Double, Double)]] = [
        "2": [(colC, 0.13), (colC, 0.87)],
        "3": [(colC, 0.13), (colC, 0.5), (colC, 0.87)],
        "4": sides([0.13, 0.87]),
        "5": sides([0.13, 0.87]) + [(colC, 0.5)],
        "6": sides(rows3),
        "7": sides(rows3) + [(colC, 0.31)],
        "8": sides(rows3) + [(colC, 0.31), (colC, 0.69)],
        "9": sides(rows4) + [(colC, 0.5)],
        "T": sides(rows4) + [(colC, 0.25), (colC, 0.75)],
    ]

    // Size of a card of this width; sizes inside the card are in units of a tenth of its width.
    static func metrics(width: Double, corner: CornerStyle = .rounded) -> (width: Double, height: Double, unit: Double, radius: Double) {
        (width, (width * aspect).rounded(), width / 10, width * cornerRadius(corner))
    }

    // How to draw a card. `artFor(name)` returns a picture reference for court and back artwork when
    // the application ships any ("card-back-<theme>.png", "card-<theme>-jack.png"), else nil;
    // `rankLabel` prints a rank in the player's language (J is V in French).
    static func faceModel(_ code: String?, theme: String = "default", backStyle: BackStyle? = nil,
                          artFor: (String) -> String? = { _ in nil }, rankLabel: (Character) -> String = { String($0) }) -> FaceModel? {
        guard let code else { return .back(art: backStyle == nil || backStyle == .art ? artFor("card-back-\(theme).png") : nil) }
        guard let card = parse(code) else { return nil }
        let rankText = "TJQKA".contains(card.rank) ? rankLabel(card.rank) : String(card.rank)
        let pip = suitGlyph(card.suit)
        let court = courtName(card.rank).flatMap { artFor("card-\(theme)-\($0).png") }
        let centre: CardCentre
        if let court { centre = .court(art: court) }
        else if card.rank == "A" { centre = .ace(pip: pip) }
        else if let spots = pips[card.rank] { centre = .pips(spots.map { CardPip(x: $0.0, y: $0.1, flip: $0.1 > 0.5, small: card.rank == "9" || card.rank == "T") }) }
        else { centre = .rank(rankText) }
        return .face(red: card.red, rank: card.rank, rankText: rankText, pip: pip, ten: card.rank == "T", centre: centre)
    }

    // Dealing: each card leaves the deck `gapMs` after the one before and takes `dealMs` to arrive.
    struct DealStep: Equatable {
        let index: Int
        let delayMs: Double
        let durationMs: Double
        let endMs: Double
    }

    static func dealPlan(count: Int, dealMs: Double = 350, gapMs: Double = 340, startMs: Double = 0) -> [DealStep] {
        (0..<max(0, count)).map { i in
            DealStep(index: i, delayMs: startMs + Double(i) * gapMs, durationMs: dealMs, endMs: startMs + Double(i) * gapMs + dealMs)
        }
    }

    // Turning a card over: progress 0 to 1. The card narrows to an edge, then shows its other side widening.
    static func flipState(_ progress: Double) -> (showingTo: Bool, scaleX: Double) {
        let p = min(1, max(0, progress))
        return p < 0.5 ? (false, cos(p * .pi)) : (true, -cos(p * .pi))
    }
}
