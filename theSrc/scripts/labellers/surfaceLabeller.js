import {polarFromCartesian, cartesiansFromPolars, toDegrees } from '../math/coord'
import positionAlongLine from '../math/positionAlongLine'
import {getLabelDimensionsUsingSvgApproximation} from '../labelUtils'
import _ from 'lodash'

const positionLabels = ({
  svg,
  surfaceLabels,
  minLabelDistance,
  radialPadding,
  fontFamily,
  fontSize,
  cx,
  cy,
  radius,
}) => {
  const labels = _(surfaceLabels)
    .cloneDeep()
    .map(label => {
      const x = (label.x * radius) + cx
      const y = (-label.y * radius) + cy
      const {width, height} = getLabelDimensionsUsingSvgApproximation({
        parentContainer: svg,
        text: label.name,
        fontSize: label.size * fontSize,
        fontFamily
      })
      return {
        id: label.id,
        name: label.name,
        size: label.size,
        truncatedName: label.name,
        anchor: { x, y },
        label: { x, y },
        // NB adding minLabelDistance to the height is a hack, but it is an easy solution that avoids modifying the label placement algorithm
        polarLabel: polarFromCartesian({ x: label.x, y: label.y, h: height + minLabelDistance }),
        width,
        height
      }
    })
    // TODO I should have to call .value() here, but that throws an error ?

  const polarCoords = _(labels)
    .map('polarLabel')
    .value()

  moveSurfaceCollisions(polarCoords, radius + radialPadding)

  const cartCoords = cartesiansFromPolars(polarCoords)
  return _(labels)
    .map((label,i) => _.merge(label, {
      label: {
        x: cartCoords[i].x + cx,
        y: -cartCoords[i].y + cy,
      }
    }))
    .map(label => _.omit(label, ['polarLabel']))
    .value()
}


function moveSurfaceCollisions (polarCoords, radius) {
  const lengthOfLine = radius * 2 * Math.PI
  for (let pc of Array.from(polarCoords)) {
    pc.r = radius
  }

  polarCoords = _.sortBy(polarCoords, coords => coords.a)
  const moveAmount = (0.2 / 360) * 2 * Math.PI // deg to rad
  let collisions = detectSurfaceCollisions(polarCoords, lengthOfLine)

  // NB On "radialAdjustmentStrategy"
  // In the moonplot context it should only be necessary to to modify the angle, not the radius
  // but once a label is offset from its anchor because we adjusted its angle, it is aesthetically pleasing to give it
  // a bit of seperation from the circle so that we can see the link and identify that the label has been moved
  // this should only be done once, whereas in the current algo it will get repeatedly bumped on every adjustment ...
  const radiusIncrement = (0.1 * lengthOfLine) / 360
  const elevatedRadialPosition = radius + (0.3 * lengthOfLine) / 360
  const radialAdjustmentStrategy = 'FIXED' // ['NONE', 'INCREMENTAL', 'FIXED'] // TODO could make enum, not worth it for now

  let maxMoves = 500
  while ((collisions.length > 0) && (maxMoves > 0)) {
    maxMoves--
    for (let pc of Array.from(polarCoords)) {
      if (pc.collision_l || pc.collision_r) {
        if (radialAdjustmentStrategy === 'INCREMENTAL') { pc.r += radiusIncrement }
        if (radialAdjustmentStrategy === 'FIXED') { pc.r = elevatedRadialPosition }
      }

      if (pc.collision_l) {
        if (pc.a > (0.5 * Math.PI)) { // UL
          pc.a += moveAmount
        } else if (pc.a < (-0.5 * Math.PI)) { // LL
          pc.a += moveAmount
        } else if ((pc.a > (-0.5 * Math.PI)) && (pc.a < 0)) { // LR
          pc.a += moveAmount
        } else if ((pc.a > 0) && (pc.a < (0.5 * Math.PI))) { // UR
          pc.a += moveAmount
        }
        pc.collision_l = false
      } else if (pc.collision_r) {
        if (pc.a > (0.5 * Math.PI)) { // UL
          pc.a -= moveAmount
        } else if (pc.a < (-0.5 * Math.PI)) { // LL
          pc.a -= moveAmount
        } else if ((pc.a > (-0.5 * Math.PI)) && (pc.a < 0)) { // LR
          pc.a -= moveAmount
        } else if ((pc.a > 0) && (pc.a < (0.5 * Math.PI))) { // UR
          pc.a -= moveAmount
        }
        pc.collision_r = false
      }

      collisions = detectSurfaceCollisions(polarCoords, lengthOfLine)
    }
  }
}

function detectSurfaceCollisions (polarCoords, lengthOfLine) {
  const errorAllowed = 5
  const collisions = []
  let i = 0
  while (i < polarCoords.length) {
    const p1 = polarCoords[i]
    i++
    let j = i
    while (j < polarCoords.length) {
      const p2 = polarCoords[j]
      j++
      if (p1 !== p2) {
        const p1l = positionAlongLine(p1.a, lengthOfLine) + errorAllowed
        const p1r = (p1l + p1.h) - errorAllowed
        const p2l = positionAlongLine(p2.a, lengthOfLine) + errorAllowed
        const p2r = (p2l + p2.h) - errorAllowed
        if ((p1r > p2l) && (p1l < p2r)) {
          p1.collision_r = true
          p2.collision_l = true
          collisions.push([p1, p2])
        } else if ((p2r > p1l) && (p2l < p1r)) {
          p1.collision_l = true
          p2.collision_r = true
          collisions.push([p1, p2])
        }
      }
    }
  }
  return collisions
}

module.exports = { positionLabels }
