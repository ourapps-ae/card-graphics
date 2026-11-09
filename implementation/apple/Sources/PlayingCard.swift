#if canImport(UIKit)
import SwiftUI

// How a card finds its colours, pictures and ranks: set by the application, read by every card below it.
struct CardStyle {
    var settings = CardSettings()
    // The colours: paper, paperAccent and onPrimary of the theme component's tokens.
    var colours = ThemeSet.named(nil)
    // The artwork theme name used in file names ("card-back-<name>.png").
    var artTheme = "default"
    // The back and court pictures, by file name (see CardModel.faceModel); nil when there are none.
    var image: (String) -> UIImage? = { _ in nil }
    // A rank in the player's language.
    var rankLabel: (Character) -> String = { String($0) }
}

private struct CardStyleKey: EnvironmentKey {
    static let defaultValue = CardStyle()
}

extension EnvironmentValues {
    var cardStyle: CardStyle {
        get { self[CardStyleKey.self] }
        set { self[CardStyleKey.self] = newValue }
    }
}

extension View {
    func cardStyle(_ style: CardStyle) -> some View { environment(\.cardStyle, style) }
}

// A playing card: nil is face down. Width sets the size; height is 1.4 times that. The face carries
// the rank over a small pip top left and the same upside down bottom right, and a faint central box
// holding either a court picture or the pips laid out as on a printed card.
struct PlayingCard: View {
    let code: String?
    var width: CGFloat? = nil
    var dim = false
    var tappable = false
    var onTap: (() -> Void)? = nil
    @Environment(\.cardStyle) private var style

    var body: some View {
        let w = width ?? CGFloat(style.settings.cardWidth)
        let m = CardModel.metrics(width: Double(w), corner: style.settings.cornerStyle)
        let shape = RoundedRectangle(cornerRadius: CGFloat(m.radius))
        let model = CardModel.faceModel(code, theme: style.artTheme, backStyle: style.settings.backStyle,
                                        artFor: { style.image($0) == nil ? nil : $0 }, rankLabel: style.rankLabel)
        let paper = Color(style.colours.colour.paper)
        let accent = Color(style.colours.colour.paperAccent)
        Group {
            switch model {
            case let .face(red, _, rankText, pip, ten, centre):
                face(red: red, rankText: rankText, pip: pip, ten: ten, centre: centre, width: w)
            case let .back(art):
                if let art, let image = style.image(art) {
                    Image(uiImage: image).resizable().scaledToFill().overlay(shape.stroke(paper, lineWidth: 1.5))
                } else if style.settings.backStyle == .plain {
                    accent.opacity(0.8).overlay(shape.stroke(paper, lineWidth: 2))
                } else {
                    LinearGradient(colors: [accent, accent.opacity(0.7)], startPoint: .topLeading, endPoint: .bottomTrailing)
                        .overlay(shape.stroke(paper, lineWidth: 2))
                }
            case nil:
                Color.gray
            }
        }
        .frame(width: w, height: CGFloat(m.height))
        .clipShape(shape)
        .shadow(color: .black.opacity(0.6), radius: 3, y: 2)
        .opacity(dim ? 0.4 : 1)
        .cardGlow(tappable, cornerRadius: CGFloat(m.radius))
        .cardTap(onTap)
    }

    private func face(red: Bool, rankText: String, pip: String, ten: Bool, centre: CardCentre, width: CGFloat) -> some View {
        let colour = Color(red ? style.colours.colour.paperAccent : style.colours.colour.onPrimary)
        let unit = width / 10
        let height = width * 1.4
        var courtImage: UIImage?
        if case let .court(art) = centre { courtImage = style.image(art) }
        let boxW = width * (courtImage != nil ? 0.72 : 0.6), boxH = width * (courtImage != nil ? 1.008 : 0.84)
        return ZStack(alignment: .topLeading) {
            Color(style.colours.colour.paper)
            // The indices sit over the picture, whose corners are not transparent.
            index(rankText, pip, colour, unit, wide: ten).offset(x: width * 0.035, y: width * 0.03).zIndex(1)
            index(rankText, pip, colour, unit, wide: ten).rotationEffect(.degrees(180))
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing).padding(.trailing, width * 0.035).padding(.bottom, width * 0.03).zIndex(1)
            ZStack(alignment: .topLeading) {
                switch centre {
                case .court:
                    if let courtImage { Image(uiImage: courtImage).resizable().scaledToFill().frame(width: boxW, height: boxH).clipped() }
                case .ace:
                    Text(pip).font(.system(size: unit * 4)).foregroundStyle(colour).frame(width: boxW, height: boxH)
                case let .pips(spots):
                    ForEach(Array(spots.enumerated()), id: \.offset) { _, spot in
                        Text(pip).font(.system(size: unit * (spot.small ? 1.3 : 1.5))).foregroundStyle(colour)
                            .rotationEffect(.degrees(spot.flip ? 180 : 0))
                            .position(x: boxW * spot.x, y: boxH * spot.y)
                    }
                case let .rank(text):
                    Text(text).font(.system(size: unit * 4, weight: .bold)).foregroundStyle(colour).frame(width: boxW, height: boxH)
                }
            }
            .frame(width: boxW, height: boxH)
            .overlay(RoundedRectangle(cornerRadius: width * 0.03).stroke(Color(style.colours.colour.onPrimary).opacity(0.15), lineWidth: 0.5))
            .offset(x: (width - boxW) / 2, y: height * (courtImage != nil ? 0.14 : 0.2))
        }
    }

    // Rank over a small suit pip, as in the corner of a printed card; a 10 on one line, narrowed.
    private func index(_ rank: String, _ pip: String, _ colour: Color, _ unit: CGFloat, wide: Bool) -> some View {
        VStack(spacing: unit * 0.1) {
            Text(rank).font(.system(size: unit * 1.7, weight: .bold).width(wide ? .condensed : .standard)).tracking(wide ? -unit * 0.1 : 0)
                .lineLimit(1).fixedSize()
            Text(pip).font(.system(size: unit * 1.2))
        }
        .foregroundStyle(colour)
        .frame(width: unit * 1.6)
    }
}

extension View {
    // A tap action only when there is one, so a card with nothing to do leaves taps to what holds it.
    @ViewBuilder
    func cardTap(_ action: (() -> Void)?) -> some View {
        if let action {
            #if os(tvOS)
            Button(action: action) { self }.buttonStyle(.bordered)
            #else
            contentShape(Rectangle()).onTapGesture(perform: action)
            #endif
        } else { self }
    }
}

// An empty place for a card, such as a board slot.
struct CardSlot: View {
    var width: CGFloat? = nil
    @Environment(\.cardStyle) private var style

    var body: some View {
        let w = width ?? CGFloat(style.settings.cardWidth)
        let m = CardModel.metrics(width: Double(w), corner: style.settings.cornerStyle)
        RoundedRectangle(cornerRadius: CGFloat(m.radius)).stroke(Color.white.opacity(0.25), style: StrokeStyle(lineWidth: 1.5, dash: [4]))
            .frame(width: w, height: CGFloat(m.height))
    }
}

// A card that arrives from the deck: slides in from `from` (an offset, points, relative to where it
// lands) after `step.delayMs`, taking `step.durationMs`.
struct DealtCard: View {
    let code: String?
    var width: CGFloat? = nil
    let step: CardModel.DealStep
    let from: CGSize
    @State private var landed = false

    var body: some View {
        PlayingCard(code: code, width: width)
            .offset(landed ? .zero : from)
            .scaleEffect(landed ? 1 : 0.7)
            .opacity(landed ? 1 : 0)
            .task {
                if step.delayMs > 0 { try? await Task.sleep(nanoseconds: UInt64(step.delayMs * 1_000_000)) }
                withAnimation(.easeOut(duration: step.durationMs / 1000)) { landed = true }
            }
    }
}

// A card that turns over: shows `from` (usually nil, face down) and turns to `to` when `flipped`
// becomes true. The face swaps at the half turn.
struct FlippingCard: View {
    let from: String?
    let to: String?
    var width: CGFloat? = nil
    let flipped: Bool
    var durationMs: Double = 400
    @State private var progress = 0.0

    var body: some View {
        FlipFace(progress: progress, from: from, to: to, width: width)
            .onChange(of: flipped, initial: true) { _, now in
                withAnimation(.easeInOut(duration: durationMs / 1000)) { progress = now ? 1 : 0 }
            }
    }
}

// Animatable so every frame of the turn is drawn: narrowing, swapping the face, widening.
private struct FlipFace: View, Animatable {
    var progress: Double
    let from: String?
    let to: String?
    let width: CGFloat?

    var animatableData: Double {
        get { progress }
        set { progress = newValue }
    }

    var body: some View {
        let state = CardModel.flipState(progress)
        PlayingCard(code: state.showingTo ? to : from, width: width).scaleEffect(x: CGFloat(max(abs(state.scaleX), 0.001)), y: 1)
    }
}

// Pulsing white halo behind a card the person may tap right now.
private struct CardGlow: ViewModifier {
    let active: Bool
    let cornerRadius: CGFloat
    @State private var pulse = false

    func body(content: Content) -> some View {
        content.background {
            if active {
                RoundedRectangle(cornerRadius: cornerRadius + 6).fill(Color.white.opacity(pulse ? 0.55 : 0.2)).padding(-6)
                    .onAppear { withAnimation(.easeInOut(duration: 0.7).repeatForever(autoreverses: true)) { pulse = true } }
                    .onDisappear { pulse = false }
            }
        }
    }
}

extension View {
    fileprivate func cardGlow(_ active: Bool, cornerRadius: CGFloat) -> some View { modifier(CardGlow(active: active, cornerRadius: cornerRadius)) }
}
#endif
