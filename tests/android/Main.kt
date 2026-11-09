import ae.cards.*
import kotlin.math.abs

// Mirrors tests/apple/main.swift: faces are compared with rows the TypeScript produced (Expected.kt).
fun check(condition: Boolean, message: String) { if (!condition) { System.err.println("FAIL: $message"); System.exit(1) } }
fun near(a: Double, b: Double, what: String) = check(abs(a - b) < 1e-9, "$what: $a vs $b")

fun main() {
    val french = mapOf('J' to "V", 'Q' to "D", 'K' to "R", 'A' to "A", 'T' to "10")
    check(CardModel.allCards().size == 52 && CardModel.allCards().toSet().size == 52, "52 cards")
    check(CardModel.parse("Ah") == ParsedCard('A', 'h') && CardModel.parse("Ah")!!.red && !CardModel.parse("Ts")!!.red, "parse")
    check(CardModel.parse("Xh") == null && CardModel.parse("A") == null && CardModel.parse("10h") == null && CardModel.parse(null) == null, "bad codes")
    check(CardModel.faceModel("1x") == null, "a bad code has no model")
    for (row in EXPECTED_FACES) {
        val code = row[0] as String
        val m = CardModel.faceModel(code, rankLabel = { french[it] ?: it.toString() }) as FaceModel.Face
        check((row[1] == 1) == m.red && row[2] == m.rankText && (row[3] == 1) == m.ten, "$code basics")
        val detail = row[5] as String
        when (val c = m.centre) {
            is CardCentre.Ace -> check(row[4] == "ace" && detail == c.pip, "$code ace")
            is CardCentre.Rank -> check(row[4] == "rank" && detail == c.text, "$code rank")
            is CardCentre.Court -> check(false, "$code court without art")
            is CardCentre.Pips -> {
                check(row[4] == "pips", "$code pips")
                val expected = detail.split(";")
                check(expected.size == c.pips.size, "$code pip count")
                expected.forEachIndexed { i, e ->
                    val (x, y, flip, small) = e.split(":")
                    near(c.pips[i].x, x.toDouble(), "$code x"); near(c.pips[i].y, y.toDouble(), "$code y")
                    check(c.pips[i].flip == (flip == "1") && c.pips[i].small == (small == "1"), "$code flags")
                }
            }
        }
    }
    for (r in "23456789") check(CardModel.PIPS.getValue(r).size == r.digitToInt(), "pips for $r")
    check(CardModel.PIPS.getValue('T').size == 10, "ten pips")
    val art: (String) -> String? = { if (it == "card-royal-queen.png") "queen.png" else null }
    check((CardModel.faceModel("Qh", "royal", artFor = art) as FaceModel.Face).centre == CardCentre.Court("queen.png"), "court art")
    check((CardModel.faceModel("Kh", "royal", artFor = art) as FaceModel.Face).centre == CardCentre.Rank("K"), "no art for the king")
    check(CardModel.faceModel(null) == FaceModel.Back(null), "plain back")
    check(CardModel.faceModel(null, "royal", artFor = { "back.png" }) == FaceModel.Back("back.png"), "art back")
    check(CardModel.faceModel(null, "royal", BackStyle.STRIPES, artFor = { "back.png" }) == FaceModel.Back(null), "stripes ignore art")
    val m = CardModel.metrics(100.0, CornerStyle.SOFT)
    near(m.height, 140.0, "height"); near(m.unit, 10.0, "unit"); near(m.radius, 14.0, "radius")
    check(CardSettings().isValid && !CardSettings(cardWidth = 2.0).isValid && !CardSettings(cardWidth = Double.NaN).isValid, "settings")
    val plan = CardModel.dealPlan(4)
    check(plan.map { it.delayMs } == listOf(0.0, 340.0, 680.0, 1020.0) && plan[3].endMs == 1370.0 && CardModel.dealPlan(-2).isEmpty(), "dealing")
    check(CardModel.flipState(0.0) == (false to 1.0) && CardModel.flipState(1.0).first && abs(CardModel.flipState(0.5).second) < 1e-12, "flipping")
    near(CardModel.flipState(0.25).second, CardModel.flipState(0.75).second, "mirror image about the half turn")
    println("android card checks passed (${EXPECTED_FACES.size} faces)")
}
