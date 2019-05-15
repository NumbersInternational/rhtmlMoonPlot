 /* global document */

import _ from 'lodash'
import * as d3 from 'd3'

import PlotState from './plotState'
import buildConfig from './buildConfig'
import buildLabelObjectsFromConfig from './math/buildLabelObjectsFromConfig'

import CoreLabeller from './labellers/coreLabeller'
import SurfaceLabeller from './labellers/surfaceLabeller'

import CorelLabels from './components/coreLabels'
import SurfacelLabels from './components/surfaceLabels'
import Circle from './components/circle'

class MoonPlot {
  static initClass () {
    this.widgetIndex = 0
    this.widgetName = 'moonPlot'
  }

  constructor (element) {
    this.id = `${MoonPlot.widgetName}-${MoonPlot.widgetIndex++}`
    this.registeredStateListeners = []
    this.rootElement = element
    const { width, height } = getContainerDimensions(_.has(this.rootElement, 'length') ? this.rootElement[0] : this.rootElement)
    this.svg = d3.select(this.rootElement).append('svg')
      .attr('class', 'svgContent')
      .attr('width', width)
      .attr('height', height)

    this.init()
  }

  init () {
    console.log('moonplot init')
    this.plotState = new PlotState(this)
    this.config = null
    this.inputData = null
  }

  reset () {
    console.log('moonplot reset')
    this.registeredStateListeners.forEach(dergisterFn => dergisterFn())
    this.init()
  }

  clearPlot () {
    this.svg.selectAll('*').remove()
  }

  setConfig (config) {
    this.config = buildConfig(_.omit(config,['coreNodes', 'surfaceNodes', 'coreLabels', 'surfaceLabels']))
    this.inputData = _.pick(config,['coreNodes', 'surfaceNodes', 'coreLabels', 'surfaceLabels'])
  }

  static defaultState () {
    return _.cloneDeep({
      version: 1,
      sourceData: { coreLabels: [], surfaceLabels: [] },
      plot: { coreLabels: [], surfaceLabels: [] },
      plotSize: { width: null, height: null },
      circleRadius: null, // TODO just make it radius or plotRadius, or move to plot.radius
    })
  }

  addStateListener (listener) {
    this.registeredStateListeners.push(this.plotState.addListener(listener))
  }

  checkState (previousUserState) {
    const { width, height } = getContainerDimensions(_.has(this.rootElement, 'length') ? this.rootElement[0] : this.rootElement)
    const { coreLabels, surfaceLabels } = buildLabelObjectsFromConfig(this.inputData)
    const stateIsValid = !_.isNull(previousUserState) &&
      previousUserState.version === 1 &&
      Math.abs(previousUserState.plotSize.width - width) < 2 && // TODO configurable tolerance
      Math.abs(previousUserState.plotSize.height - height) < 2 && // TODO configurable tolerance
      _.isEqual(previousUserState.sourceData, { coreLabels, surfaceLabels }) && // TODO this is inefficient
      _.has(previousUserState, 'plotSize') &&
      _.has(previousUserState, 'circleRadius')

    return stateIsValid
  }

  restoreState (previousUserState) {
    this.plotState.initialiseState(previousUserState)
  }

  // TODO newRadius is a bit hacky
  resetState (newRadius) {
    const { width, height } = getContainerDimensions(_.has(this.rootElement, 'length') ? this.rootElement[0] : this.rootElement)
    const radius = (newRadius) ? newRadius : Math.min(height, width) / 3 // TODO move the 3 to config
    const sourceData = buildLabelObjectsFromConfig(this.inputData)
    const coreLabels = CoreLabeller.positionLabels({
      svg: this.svg,
      coreLabels: sourceData.coreLabels,
      minLabelDistance: this.config.coreLabelMinimumLabelDistance,
      fontFamily: this.config.coreLabelFontFamily,
      fontSize: this.config.coreLabelFontSize,
      radius,
      cx: width / 2, // TODO maintain in state ?,
      cy: height / 2 // TODO maintain in state ?
    })

    const surfaceLabels = SurfaceLabeller.positionLabels({
      svg: this.svg,
      surfaceLabels: sourceData.surfaceLabels,
      minLabelDistance: this.config.surfaceLabelMinimumLabelDistance,
      radialPadding: this.config.surfaceLabelRadialPadding,
      fontFamily: this.config.surfaceLabelFontFamily,
      fontSize: this.config.surfaceLabelFontBaseSize,
      radius,
      cx: width / 2, // TODO maintain in state ?,
      cy: height / 2 // TODO maintain in state ?
    })

    this.plotState.setState(_.merge({}, MoonPlot.defaultState(), {
      version: 1,
      sourceData: sourceData,
      plot: { coreLabels, surfaceLabels },
      plotSize: { width, height },
      circleRadius: radius
    }))
  }

  draw () {
    this.clearPlot()
    const { width, height } = getContainerDimensions(_.has(this.rootElement, 'length') ? this.rootElement[0] : this.rootElement)
    const cx = width / 2 // TODO maintain in state ?
    const cy = height / 2 // TODO maintain in state ?

    this.svg
      .attr('width', width)
      .attr('height', height)

    this.coreLabels = new CorelLabels({
      parentContainer: this.svg,
      plotState: this.plotState,
      cx,
      cy,
      fontFamily: this.config.coreLabelFontFamily,
      fontSize: this.config.coreLabelFontSize,
      fontColor: this.config.coreLabelFontColor,
      fontSelectedColor: this.config.coreLabelFontSelectedColor,
      linkWidth: this.config.linkWidth,
      linkColor: this.config.linkColor
    })

    this.surfaceLabels = new SurfacelLabels({
      parentContainer: this.svg,
      plotState: this.plotState,
      cx,
      cy,
      height,
      width,
      fontFamily: this.config.surfaceLabelFontFamily,
      fontSize: this.config.surfaceLabelFontBaseSize,
      fontColor: this.config.surfaceLabelFontColor,
      fontSelectedColor: this.config.surfaceLabelFontSelectedColor,
      linkWidth: this.config.linkWidth,
      linkColor: this.config.linkColor
    })

    this.circle = new Circle({
      parentContainer: this.svg,
      plotState: this.plotState,
      cx,
      cy,
      circleColor: this.config.circleColor,
      crossColor: this.config.crossColor,
      circleStrokeWidth: this.config.circleStrokeWidth
    })

    this.coreLabels.draw()
    this.surfaceLabels.draw()
    this.circle.draw()
  }
}
MoonPlot.initClass()
module.exports = MoonPlot

// TODO to utils
function getContainerDimensions (rootElement) {
  try {
    return rootElement.getBoundingClientRect()
  } catch (err) {
    err.message = `fail in getContainerDimensions: ${err.message}`
    throw err
  }
}
