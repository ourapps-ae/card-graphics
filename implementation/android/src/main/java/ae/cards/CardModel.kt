package ae.cards

import kotlin.math.cos

// What a playing card looks like, as data: the pure part of the card drawing, matching
// web/card-model.ts. A card code is a rank (2-9, T, J, Q, K, A) then a suit (c, d, h, s), such as
// "Ah" or "Td". null is a card face down.
enum class BackStyle { STRIPES, PLAIN, ART }
enum class CornerStyle { ROUNDED, SOFT, SQUARE }

data class CardSettings(val backStyle: BackStyle = BackStyle.STRIPES, val cornerStyle: CornerStyle = CornerStyle.ROUNDED, val cardWidth: Double = 56.0) {
    val isValid: Boolean get() = cardWidth.isFinite() && cardWidth in 8.0..600.0
}

data class ParsedCard(val rank: Char, val suit: Char) {
    val red: Boolean get() = suit == 'h' || suit == 'd'
}

data class CardPip(val x: Double, val y: Double, val flip: Boolean, val small: Boolean)

sealed class CardCentre {
    data class Court(val art: String) : CardCentre()
    data class Ace(val pip: String) : CardCentre()
    data class Pips(val pips: List<CardPip>) : CardCentre()
    data class Rank(val text: String) : CardCentre()
}

sealed class FaceModel {
    data class Back(val art: String?) : FaceModel()
    data class Face(val red: Boolean, val rank: Char, val rankText: String, val pip: String, val ten: Boolean, val centre: CardCentre) : FaceModel()
}

data class DealStep(val index: Int, val delayMs: Double, val durationMs: Double, val endMs: Double)

object CardModel {
    const val ASPECT = 1.4
    const val RANKS = "23456789TJQKA"
    const val SUITS = "cdhs"

    fun parse(code: String?): ParsedCard? =
        if (code != null && code.length == 2 && code[0] in RANKS && code[1] in SUITS) ParsedCard(code[0], code[1]) else null

    fun allCards(): List<String> = RANKS.flatMap { r -> SUITS.map { s -> "$r$s" } }

    fun suitGlyph(suit: Char): String = when (suit) { 'c' -> "\u2663"; 'd' -> "\u2666"; 'h' -> "\u2665"; else -> "\u2660" }

    fun courtName(rank: Char): String? = when (rank) { 'J' -> "jack"; 'Q' -> "queen"; 'K' -> "king"; else -> null }

    // The fraction of the card's width used as the corner radius.
    fun cornerRadius(style: CornerStyle): Double = when (style) { CornerStyle.ROUNDED -> 0.08; CornerStyle.SOFT -> 0.14; CornerStyle.SQUARE -> 0.02 }

    // Pip positions inside the central box as fractions of its width and height, for 2 to 10 (T).
    // The lower half is printed upside down, as on a real card.
    private const val L = 0.2
    private const val C = 0.5
    private const val R = 0.8
    private val ROWS4 = listOf(0.13, 0.38, 0.62, 0.87)
    private val ROWS3 = listOf(0.13, 0.5, 0.87)
    private fun sides(rows: List<Double>) = rows.flatMap { y -> listOf(L to y, R to y) }
    val PIPS: Map<Char, List<Pair<Double, Double>>> = mapOf(
        '2' to listOf(C to 0.13, C to 0.87),
        '3' to listOf(C to 0.13, C to 0.5, C to 0.87),
        '4' to sides(listOf(0.13, 0.87)),
        '5' to sides(listOf(0.13, 0.87)) + (C to 0.5),
        '6' to sides(ROWS3),
        '7' to sides(ROWS3) + (C to 0.31),
        '8' to sides(ROWS3) + listOf(C to 0.31, C to 0.69),
        '9' to sides(ROWS4) + (C to 0.5),
        'T' to sides(ROWS4) + listOf(C to 0.25, C to 0.75),
    )

    class Metrics(val width: Double, val height: Double, val unit: Double, val radius: Double)

    // Size of a card of this width; sizes inside the card are in units of a tenth of its width.
    fun metrics(width: Double, corner: CornerStyle = CornerStyle.ROUNDED) = Metrics(width, Math.round(width * ASPECT).toDouble(), width / 10, width * cornerRadius(corner))

    // How to draw a card. `artFor(name)` returns a picture reference for court and back artwork when
    // the application ships any ("card-back-<theme>.png", "card-<theme>-jack.png"), else null;
    // `rankLabel` prints a rank in the player's language (J is V in French). null for a code that is not a card.
    fun faceModel(
        code: String?, theme: String = "default", backStyle: BackStyle? = null,
        artFor: (String) -> String? = { null }, rankLabel: (Char) -> String = { it.toString() },
    ): FaceModel? {
        if (code == null) return FaceModel.Back(if (backStyle == null || backStyle == BackStyle.ART) artFor("card-back-$theme.png") else null)
        val card = parse(code) ?: return null
        val rankText = if (card.rank in "TJQKA") rankLabel(card.rank) else card.rank.toString()
        val pip = suitGlyph(card.suit)
        val court = courtName(card.rank)?.let { artFor("card-$theme-$it.png") }
        val centre = when {
            court != null -> CardCentre.Court(court)
            card.rank == 'A' -> CardCentre.Ace(pip)
            PIPS[card.rank] != null -> CardCentre.Pips(PIPS.getValue(card.rank).map { (x, y) -> CardPip(x, y, y > 0.5, card.rank == '9' || card.rank == 'T') })
            else -> CardCentre.Rank(rankText)
        }
        return FaceModel.Face(card.red, card.rank, rankText, pip, card.rank == 'T', centre)
    }

    // Dealing: each card leaves the deck `gapMs` after the one before and takes `dealMs` to arrive.
    fun dealPlan(count: Int, dealMs: Double = 350.0, gapMs: Double = 340.0, startMs: Double = 0.0): List<DealStep> =
        List(maxOf(0, count)) { i -> DealStep(i, startMs + i * gapMs, dealMs, startMs + i * gapMs + dealMs) }

    // Turning a card over: progress 0 to 1. The card narrows to an edge, then shows its other side widening.
    // Returns whether the other side shows, and the horizontal scale.
    fun flipState(progress: Double): Pair<Boolean, Double> {
        val p = progress.coerceIn(0.0, 1.0)
        return if (p < 0.5) false to cos(p * Math.PI) else true to -cos(p * Math.PI)
    }
}
