import Foundation

func fail(_ message: String) -> Never {
    FileHandle.standardError.write(Data("FAIL: \(message)\n".utf8))
    exit(1)
}
func check(_ condition: Bool, _ message: @autoclosure () -> String) { if !condition { fail(message()) } }
func near(_ a: Double, _ b: Double, _ what: String) { check(abs(a - b) < 1e-9, "\(what): \(a) vs \(b)") }

guard let data = FileManager.default.contents(atPath: "tests/fixtures/cards.json"), let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { fail("cannot read cards.json") }
let french: [Character: String] = ["J": "V", "Q": "D", "K": "R", "A": "A", "T": "10"]

// Parsing.
check(CardModel.allCards().count == 52 && Set(CardModel.allCards()).count == 52, "52 cards")
check(CardModel.parse("Ah") == ParsedCard(rank: "A", suit: "h") && CardModel.parse("Ah")!.red && !CardModel.parse("Ts")!.red, "parse")
check(CardModel.parse("Xh") == nil && CardModel.parse("A") == nil && CardModel.parse("10h") == nil && CardModel.parse(nil) == nil, "bad codes")
check(CardModel.faceModel("1x") == nil, "a bad code has no model")

// Every face equals the TypeScript model: centre type, pips, rank text, colour.
var faces = 0
for item in json["faces"] as! [[String: Any]] {
    let code = item["code"] as! String
    let e = item["model"] as! [String: Any]
    guard case let .face(red, rank, rankText, pip, ten, centre)? = CardModel.faceModel(code, rankLabel: { french[$0] ?? String($0) }) else { fail("\(code) has no face") }
    check(e["kind"] as! String == "face" && e["red"] as! Bool == red && e["rank"] as! String == String(rank), "\(code) basics")
    check(e["rankText"] as! String == rankText && e["pip"] as! String == pip && e["ten"] as! Bool == ten, "\(code) text")
    let c = e["centre"] as! [String: Any]
    switch centre {
    case .ace(let p): check(c["type"] as! String == "ace" && c["pip"] as! String == p, "\(code) ace")
    case .rank(let t): check(c["type"] as! String == "rank" && c["text"] as! String == t, "\(code) rank")
    case .court: fail("\(code) court without art")
    case .pips(let spots):
        check(c["type"] as! String == "pips", "\(code) pips")
        let expected = c["pips"] as! [[String: Any]]
        check(expected.count == spots.count, "\(code) pip count")
        for (i, p) in expected.enumerated() {
            near(spots[i].x, p["x"] as! Double, "\(code) pip x"); near(spots[i].y, p["y"] as! Double, "\(code) pip y")
            check(spots[i].flip == p["flip"] as! Bool && spots[i].small == p["small"] as! Bool, "\(code) pip flags")
        }
    }
    faces += 1
}

// Pip counts, court art and backs.
for r in Array("23456789") { check(CardModel.pips[r]!.count == Int(String(r))!, "pips for \(r)") }
check(CardModel.pips["T"]!.count == 10, "ten pips")
let art: (String) -> String? = { $0 == "card-royal-queen.png" ? "queen.png" : nil }
check(CardModel.faceModel("Qh", theme: "royal", artFor: art) == .face(red: true, rank: "Q", rankText: "Q", pip: "\u{2665}", ten: false, centre: .court(art: "queen.png")), "court art")
check(CardModel.faceModel("Kh", theme: "royal", artFor: art) == .face(red: true, rank: "K", rankText: "K", pip: "\u{2665}", ten: false, centre: .rank("K")), "no art for the king")
check(CardModel.faceModel(nil) == .back(art: nil), "plain back")
check(CardModel.faceModel(nil, theme: "royal", artFor: { _ in "back.png" }) == .back(art: "back.png"), "art back")
check(CardModel.faceModel(nil, theme: "royal", backStyle: .stripes, artFor: { _ in "back.png" }) == .back(art: nil), "stripes ignore art")

// Metrics and settings.
for m in json["metrics"] as! [[String: Any]] {
    let got = CardModel.metrics(width: (m["width"] as! NSNumber).doubleValue, corner: CornerStyle(rawValue: m["corner"] as! String)!)
    near(got.height, m["height"] as! Double, "height"); near(got.unit, m["unit"] as! Double, "unit"); near(got.radius, m["radius"] as! Double, "radius")
}
check(CardSettings().isValid && !CardSettings(cardWidth: 2).isValid && !CardSettings(cardWidth: .nan).isValid, "settings")

// Dealing and flipping.
for (i, s) in (json["deal"] as! [[String: Double]]).enumerated() {
    let plan = CardModel.dealPlan(count: 4)[i]
    near(plan.delayMs, s["delayMs"]!, "delay"); near(plan.durationMs, s["durationMs"]!, "duration"); near(plan.endMs, s["endMs"]!, "end")
}
check(CardModel.dealPlan(count: -2).isEmpty, "no cards, no plan")
for f in json["flips"] as! [[String: Any]] {
    let got = CardModel.flipState((f["progress"] as! NSNumber).doubleValue)
    check(got.showingTo == (f["showing"] as! String == "to"), "flip side at \(f["progress"]!)")
    near(got.scaleX, (f["scaleX"] as! NSNumber).doubleValue, "flip scale")
}

print("\(faces) faces matched the TypeScript model")
