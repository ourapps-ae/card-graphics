package ae.cards

import ae.theme.ComposeColours
import ae.theme.ThemeSet
import ae.theme.composeColours
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.wrapContentWidth
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.painter.Painter
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.zIndex
import kotlinx.coroutines.delay

// How a card finds its colours, pictures and ranks: provide it once; every card below reads it.
class CardStyle(
    val settings: CardSettings = CardSettings(),
    /** the colours: paper, paperAccent and onPrimary of the theme component's tokens */
    val colours: ThemeSet = ThemeSet.named(null),
    /** the artwork theme name used in file names ("card-back-<name>.png") */
    val artTheme: String = "default",
    /** whether a back or court picture of this file name ships with the application */
    val hasArt: (String) -> Boolean = { false },
    /** the picture for a file name that `hasArt` accepted */
    val painter: @Composable (String) -> Painter? = { null },
    /** a rank in the player's language */
    val rankLabel: (Char) -> String = { it.toString() },
)

val LocalCardStyle = compositionLocalOf { CardStyle() }

// A playing card: null is face down. Width sets the size; height is 1.4 times that. The face carries
// the rank over a small pip top left and the same upside down bottom right, and a faint central box
// holding either a court picture or the pips laid out as on a printed card.
@Composable
fun PlayingCard(code: String?, width: Dp? = null, dim: Boolean = false, tappable: Boolean = false, onClick: (() -> Unit)? = null, modifier: Modifier = Modifier) {
    val style = LocalCardStyle.current
    val c = remember(style.colours) { style.colours.composeColours() }
    val w = width ?: style.settings.cardWidth.dp
    val m = CardModel.metrics(w.value.toDouble(), style.settings.cornerStyle)
    val shape = RoundedCornerShape((m.radius).dp)
    val height = m.height.dp
    val base = modifier.size(w, height).cardGlow(tappable, m.radius.dp).clip(shape).graphicsLayer { alpha = if (dim) 0.4f else 1f }
        .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
    val backArt = if (code == null && style.hasArt("card-back-${style.artTheme}.png")) style.painter("card-back-${style.artTheme}.png") else null
    val model = CardModel.faceModel(code, style.artTheme, style.settings.backStyle, artFor = { if (style.hasArt(it)) it else null }, rankLabel = style.rankLabel)
    when (model) {
        null -> Box(base.background(Color.Gray))
        is FaceModel.Back -> when {
            model.art != null && backArt != null -> Image(backArt, contentDescription = null, contentScale = ContentScale.Crop, modifier = base.border(1.5.dp, c.paper, shape))
            style.settings.backStyle == BackStyle.PLAIN -> Box(base.background(c.paperAccent.copy(alpha = 0.8f)).border(2.dp, c.paper, shape))
            else -> Box(base.background(Brush.linearGradient(listOf(c.paperAccent, c.paperAccent.copy(alpha = 0.7f)))).border(2.dp, c.paper, shape))
        }
        is FaceModel.Face -> FaceContent(model, w, base, c, style)
    }
}

@Composable
private fun FaceContent(model: FaceModel.Face, width: Dp, base: Modifier, c: ComposeColours, style: CardStyle) {
    val colour = if (model.red) c.paperAccent else c.onPrimary
    val unit = width.value / 10f
    val height = width * 1.4f
    val court = (model.centre as? CardCentre.Court)?.let { style.painter(it.art) }
    val boxW = width * (if (court != null) 0.72f else 0.6f)
    val boxH = width * (if (court != null) 1.008f else 0.84f)
    Box(base.background(c.paper)) {
        // The indices sit over the picture, whose corners are not transparent.
        CornerIndex(model.rankText, model.pip, colour, unit, Modifier.align(Alignment.TopStart).offset(width * 0.035f, width * 0.03f).zIndex(1f))
        CornerIndex(model.rankText, model.pip, colour, unit, Modifier.align(Alignment.BottomEnd).offset(-width * 0.035f, -width * 0.03f).rotate(180f).zIndex(1f))
        Box(Modifier.align(Alignment.TopCenter).offset(y = height * (if (court != null) 0.14f else 0.2f)).size(boxW, boxH).border(0.5.dp, c.onPrimary.copy(alpha = 0.15f), RoundedCornerShape(width * 0.03f))) {
            when (val centre = model.centre) {
                is CardCentre.Court -> if (court != null) Image(court, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.matchParentSize())
                is CardCentre.Ace -> Text(centre.pip, color = colour, fontSize = (unit * 4f).sp, lineHeight = (unit * 4f).sp, modifier = Modifier.align(Alignment.Center))
                is CardCentre.Pips -> for (p in centre.pips) {
                    val size = unit * (if (p.small) 1.3f else 1.5f)
                    Text(
                        model.pip, color = colour, fontSize = size.sp, lineHeight = size.sp, textAlign = TextAlign.Center,
                        modifier = Modifier.offset(boxW * p.x.toFloat() - (size * 0.7f).dp, boxH * p.y.toFloat() - (size * 0.6f).dp).width((size * 1.4f).dp).rotate(if (p.flip) 180f else 0f),
                    )
                }
                is CardCentre.Rank -> Text(centre.text, color = colour, fontWeight = FontWeight.Bold, fontSize = (unit * 4f).sp, lineHeight = (unit * 4f).sp, modifier = Modifier.align(Alignment.Center))
            }
        }
    }
}

// Rank over a small suit pip, as in the corner of a printed card; a 10 on one line, narrowed.
@Composable
private fun CornerIndex(rank: String, pip: String, colour: Color, unit: Float, modifier: Modifier) {
    Column(modifier.width((unit * 1.6f).dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Text(rank, color = colour, fontWeight = FontWeight.Bold, fontSize = (unit * 1.7f).sp, lineHeight = (unit * 1.7f).sp, maxLines = 1, softWrap = false,
            letterSpacing = if (rank.length > 1) (-unit * 0.15f).sp else 0.sp, modifier = Modifier.wrapContentWidth(unbounded = true))
        Text(pip, color = colour, fontSize = (unit * 1.2f).sp, lineHeight = (unit * 1.2f).sp)
    }
}

// An empty place for a card, such as a board slot.
@Composable
fun CardSlot(width: Dp? = null) {
    val style = LocalCardStyle.current
    val w = width ?: style.settings.cardWidth.dp
    val m = CardModel.metrics(w.value.toDouble(), style.settings.cornerStyle)
    Box(Modifier.size(w, m.height.dp).border(1.5.dp, Color.White.copy(alpha = 0.25f), RoundedCornerShape(m.radius.dp)))
}

// A card that arrives from the deck: slides in from (fromX, fromY) dp relative to where it lands
// after `step.delayMs`, taking `step.durationMs`.
@Composable
fun DealtCard(code: String?, step: DealStep, fromX: Dp, fromY: Dp, width: Dp? = null) {
    val progress = remember { Animatable(0f) }
    LaunchedEffect(step) {
        if (step.delayMs > 0) delay(step.delayMs.toLong())
        progress.animateTo(1f, tween(step.durationMs.toInt()))
    }
    val p = progress.value
    Box(Modifier.offset(fromX * (1f - p), fromY * (1f - p)).graphicsLayer { alpha = p; scaleX = 0.7f + 0.3f * p; scaleY = 0.7f + 0.3f * p }) {
        PlayingCard(code, width)
    }
}

// A card that turns over: shows `from` (usually null, face down) and turns to `to` when `flipped`
// becomes true. The face swaps at the half turn.
@Composable
fun FlippingCard(from: String?, to: String?, flipped: Boolean, width: Dp? = null, durationMs: Int = 400) {
    val progress by animateFloatAsState(if (flipped) 1f else 0f, tween(durationMs), label = "flip")
    val (showingTo, scaleX) = CardModel.flipState(progress.toDouble())
    Box(Modifier.graphicsLayer { this.scaleX = maxOf(kotlin.math.abs(scaleX.toFloat()), 0.001f) }) {
        PlayingCard(if (showingTo) to else from, width)
    }
}

// Pulsing white halo behind a card the person may tap right now.
@Composable
private fun Modifier.cardGlow(active: Boolean, cornerRadius: Dp): Modifier {
    if (!active) return this
    val pulse by rememberInfiniteTransition(label = "cardGlow").animateFloat(0.35f, 1f, infiniteRepeatable(tween(700), RepeatMode.Reverse), label = "cardGlowA")
    return drawBehind {
        val pad = 6.dp.toPx()
        drawRoundRect(Color.White.copy(alpha = 0.55f * pulse), topLeft = Offset(-pad, -pad), size = Size(size.width + 2 * pad, size.height + 2 * pad), cornerRadius = CornerRadius(cornerRadius.toPx() + pad))
    }
}
