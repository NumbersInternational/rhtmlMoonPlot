'use strict'



HTMLWidgets.widget
  name: 'moonplot'
  type: 'output'
  initialize: (el, width, height) ->

    lunar_surface_links = []
    lunar_core_labels_svg = []
    lunar_core_labels = []
    # drag = null

    svgContainer = d3.select('body')
                     .append('svg')
                     .attr('width', width)
                     .attr('height', height)
    xCenter = width /2
    yCenter = height /2
    radius = Math.min(height, width) / 3

    drawCircle(svgContainer, xCenter, yCenter, radius)

    # Lunar core labels
    i = 0
    anchor_array = []
    while i < xlabels.length
      # Block lunar core labels from escaping the moon
      threshold = 1
      barrier = 0.8
      if xCoords1[i] < -threshold
        xCoords1[i] = -barrier
      if xCoords1[i] > threshold
        xCoords1[i] = barrier
      if xCoords2[i] < -threshold
        xCoords2[i] = -barrier
      if xCoords2[i] > threshold
        xCoords2[i] = barrier
      x = xCoords1[i] * radius + xCenter
      y = -xCoords2[i] * radius + yCenter

      lunar_core_labels.push({
        x: x
        y: y
        name: xlabels[i]
        id: xlabels[i]
        ox: x
        oy: y
        })

      i++


    drag = setupDragAndDrop(svgContainer,
                            lunar_core_labels,
                            lunar_surface_links,
                            radius,
                            xCenter,
                            yCenter)

    lunar_core_labels_svg = svgContainer.selectAll('.core-label')
                              .data(lunar_core_labels)
                              .enter()
                              .append('text')
                              .style('fill', 'black')
                              .attr('class', 'core-label')
                              .attr('x', (d) -> d.x)
                              .attr('y', (d) -> d.y)
                              .attr('ox', (d) -> d.x)
                              .attr('oy', (d) -> d.y)
                              .attr('cursor', 'all-scroll')
                              .attr('text-anchor', 'start')
                              .style('font-family', 'Arial')
                              .attr('title', (d) -> d.name)
                              .text (d) -> d.name
                              .call(drag)


    # Size of each labeler
    for core_label in lunar_core_labels_svg[0]
      i = _.findIndex lunar_core_labels, (e) -> e.name == core_label.innerHTML
      lunar_core_labels[i].width = core_label.getBBox().width
      lunar_core_labels[i].height = core_label.getBBox().height

    # Build the anchor arrays
    for lunar_core_label in lunar_core_labels
      anchor_array.push({
        x: lunar_core_label.x
        y: lunar_core_label.y
        r: 2
        })

    # Lay the anchor
    for anchor in anchor_array
      d3.select('svg').append('circle')
                      .attr('stroke-width', 3)
                      .attr('fill', 'black')
                      .attr('cx', anchor.x)
                      .attr('cy', anchor.y)
                      .attr('r', anchor.r)

    # Draw the links
    lunar_core_links_svg = svgContainer.append('g').selectAll('.core-link')
                        .data(lunar_core_labels)
                        .enter()
                        .append('line')
                        .attr('class', 'core-link')
                        .attr('x1', (d) -> d.x)
                        .attr('y1', (d) -> d.y)
                        .attr('x2', (d) -> d.x)
                        .attr('y2', (d) -> d.y)
                        .attr('stroke-width', 0.6)
                        .attr('stroke', 'gray')


    # Check if labels are overlapping and if need to be repositioned
    labeler = d3.labeler()
      .label(lunar_core_labels)
      .anchor(anchor_array)
      .width(600)
      .height(600)
      .start(100)

    lunar_core_labels_svg.transition()
        .duration(800)
        .attr('x', (d) -> d.x)
        .attr('y', (d) -> d.y)

    lunar_core_links_svg.transition()
        .duration(800)
        .attr('x2', (d) -> d.x)
        .attr('y2', (d) -> d.y)

    adjustCoreLabelLength(lunar_core_labels_svg[0], radius, xCenter, yCenter)
    # ----------------------------------------------------------------

    # Loop through lunar surface labels
    cart_coords = []
    t = null
    i = 0
    while i < ylabels.length
      x = yCoords1[i] * radius * 0.7 + xCenter
      y = -yCoords2[i] * radius * 0.7 + yCenter

      if yCoords1[i] < 0
        t = svgContainer.append('text')
                    .style('fill', 'black')
                    .attr('class', 'surfaceLabel')
                    .attr('x', x)
                    .attr('y', y)
                    .attr('font-size', (ySizes[i] * 20).toString() + 'px')
                    .attr('text-anchor', 'end')
                    .attr('cursor', 'all-scroll')
                    .style('font-family', 'Arial')
                    .text ylabels[i]
                    .call(drag)
      else
        t = svgContainer.append('text')
                    .style('fill', 'black')
                    .attr('class', 'surfaceLabel')
                    .attr('y', y)
                    .attr('x', x)
                    .attr('font-size', (ySizes[i] * 20).toString() + 'px')
                    .attr('text-anchor', 'start')
                    .attr('cursor', 'all-scroll')
                    .style('font-family', 'Arial')
                    .text ylabels[i]
                    .call(drag)
      cart_coords.push
        x: yCoords1[i]
        y: yCoords2[i]
        h: t[0][0].getBBox().height
      i++

    svgContainer.selectAll('.surfaceLabel').remove()
    polar_coords = polarCoords cart_coords
    length_of_line = radius * 2 * Math.PI

    moveSurfaceCollsions(polar_coords, length_of_line, radius)
    cart_coords = cartesianCoords polar_coords


    # Plot the surface links
    for pc in polar_coords
      if pc.oa
        cc = cartesianCoord {
          a: pc.oa
          r: pc.or
          h: pc.h
        }
        cc_new = cartesianCoord pc

        x =  cc.x + xCenter
        y = -cc.y + yCenter
        x_new =  cc_new.x + xCenter
        y_new = -cc_new.y + yCenter
        l = svgContainer.append('line')
                    .attr('class', 'surface-link')
                    .attr('x1', x)
                    .attr('y1', y)
                    .attr('x2', x_new)
                    .attr('y2', y_new)
                    .attr('stroke', 'gray')
                    .attr('stroke-width', 0.6)
        lunar_surface_links.push
          x1: x
          y1: y
          x2: x_new
          y2: y_new

    t = null
    lunar_surface_labels = []
    i = 0
    while i < ylabels.length
      x =  cart_coords[i].x + xCenter
      y = -cart_coords[i].y + yCenter
      rotation = calculateLabelRotation(polarCoord(cart_coords[i]).a)

      if cart_coords[i].x < 0
        t = svgContainer.append('text')
                    .style('fill', 'black')
                    .attr('class', 'surface-label')
                    .attr('x', x)
                    .attr('y', y)
                    .attr('ox', x)
                    .attr('oy', y)
                    .attr('font-size', (ySizes[i] * 20).toString() + 'px')
                    .attr('transform', 'rotate(' + (180 - rotation).toString() + ',' + x.toString() + ', ' + y.toString() + ')')
                    .attr('text-anchor', 'end')
                    .attr('cursor', 'all-scroll')
                    .style('font-family', 'Arial')
                    .attr('title', ylabels[i])
                    .text ylabels[i]
                    .call(drag)

      else
        t = svgContainer.append('text')
                    .style('fill', 'black')
                    .attr('class', 'surface-label')
                    .attr('y', y)
                    .attr('x', x)
                    .attr('ox', x)
                    .attr('oy', y)
                    .attr('font-size', (ySizes[i] * 20).toString() + 'px')
                    .attr('transform', 'rotate(' + (-rotation).toString() + ',' + x.toString() + ', ' + y.toString() + ')')
                    .attr('text-anchor', 'start')
                    .attr('cursor', 'all-scroll')
                    .style('font-family', 'Arial')
                    .attr('title', ylabels[i])
                    .text ylabels[i]
                    .call(drag)

      lunar_surface_labels.push t[0][0]
      i++

    adjustSurfaceLabelLength lunar_surface_labels, height, width

    el.id = svgContainer

  resize: (el, width, height, instance) ->
  renderValue: (el, x, instance) ->
