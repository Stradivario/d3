import { Component, state } from '@rxdi/lit-html';
import { css, html, LitElement, query } from '@rxdi/lit-html';
import {
  color,
  geoAzimuthalEqualArea,
  geoEquirectangular,
  geoGraticule,
  geoMercator,
  geoNaturalEarth1,
  geoOrthographic,
  geoPath,
  GeoProjection,
  json,
  pointer,
  scaleLinear,
  select,
  Selection,
  transition,
} from 'd3';

// import {} from 'd3-geo';
import borders from './wb_borders.json';
import disputedAreas from './wb_disp_areas.json';

/**
 * @customElement d3-map
 */
@Component({
  selector: 'd3-map',
  styles: [
    css`
      .graticule {
        fill: none;
        stroke: white;
        stroke-width: 0.5px;
      }

      .foreground {
        fill: #f3f3f3;
        stroke: none;
        stroke-width: 1.5px;
      }

      .dashed {
        stroke-dasharray: 2, 1;
        stroke: white;
      }

      .map {
        margin-top: 20px;
      }

      .form-control {
        display: flow;
        float: right;
        margin-right: 20px;
        margin-bottom: 20px;
      }
    `,
  ],

  template(this: D3Component) {
    return html`
      <svg width="800" height="600" class="map"></svg>
      <div style="display: flex; flex-direction: row;">
        <svg id="svg" width="800" height="600" class="map"></svg>
        <div style="padding:20px">
          <select id="projection" @change=${() => this.onChangeProjection()} class="form-control">
            <option value="natutal_earth">Equal Earth</option>
            <option value="orthographic" selected>Orthographic</option>
            <option value="azimuthal_equal_area">Azimuthal Equal Area</option>
            <option value="equi_rectangular">Equirectangular</option>
            <option value="mercator">Mercator</option>
          </select>
          <select id="indicator" @change=${() => this.onChangeIndicator()} class="form-control">
            <option value="SP.DYN.AMRT.FE" selected>Mortality rate, adult, female (per 1,000 female adults)</option>
            <option value="NY.GDP.PCAP.CD">GDP per capita (Current US$)</option>
            <option value="EN.ATM.CO2E.PC">CO2 Emissions (Metric Tons Per Capita)</option>
            <option value="EG.ELC.ACCS.ZS">Access to electricity (% of population)</option>
          </select>
        </div>
      </div>
    `;
  },
})
export class D3Component extends LitElement {
  @query('svg')
  svgElement: SVGElement;

  @query('#projection')
  projection: HTMLSelectElement;

  @query('#indicator')
  indicatorElement: HTMLSelectElement;

  d3Svg: Selection<SVGElement, unknown, null, undefined>;

  @state()
  state = {
    borders,
    disputedAreas,
  };

  yaw = 0;
  xaw = 0;

  indicators = {
    'SP.DYN.AMRT.FE': {
      code: 'SP.DYN.AMRT.FE/2010',
      legend: 'Mortality rate, adult, female (per 1,000 female adults)',
    },
    'NY.GDP.PCAP.CD': { code: 'NY.GDP.PCAP.CD/2020', legend: 'GDP per capita (Current US$)' },
    'EN.ATM.CO2E.PC': { code: 'EN.ATM.CO2E.PC/2020', legend: 'CO2 Emissions (Metric Tons Per Capita)' },
    'EG.ELC.ACCS.ZS': { code: 'EG.ELC.ACCS.ZS/mrv=10', legend: 'Access to electricity (% of population)' },
  };
  indicator = this.indicators['SP.DYN.AMRT.FE'];

  features;

  selectedProjection = 'orthographic';

  graticule = geoGraticule();

  myProjection: GeoProjection = this.getProjection(this.selectedProjection);
  path = geoPath().projection(this.myProjection);

  boundaries;

  dashedBorders;
  disputed;
  x_old = 400;
  y_old = 300;

  mouseDown = false;

  color;

  async OnUpdateFirst() {
    const width = 800;
    const height = 600;

    this.d3Svg = select(this.svgElement).attr('viewBox', [0, 0, width, height]);

    const data = await json(
      `https://maps.worldbank.org/gspext-api/rest/wb/countries/all/indicators/${this.indicator.code}`
    );
    this.features = data['geojson'].features;
    await this.drawMap();
  }

  async onChangeIndicator() {
    this.selectedProjection = this.projection.value;
    this.myProjection = this.getProjection(this.selectedProjection);
    this.path = geoPath().projection(this.myProjection);
    this.yaw = 0;
    this.xaw = 0;
    await this.drawMap();
  }

  async onChangeProjection() {
    this.selectedProjection = this.projection.value;
    this.myProjection = this.getProjection(this.selectedProjection);
    this.path = geoPath().projection(this.myProjection);
    this.yaw = 0;
    this.xaw = 0;
    await this.drawMap();
  }

  getProjection(proj: string) {
    switch (proj) {
      case 'natutal_earth':
        return geoNaturalEarth1();
      case 'orthographic':
        return geoOrthographic();
      case 'azimuthal_equal_area':
        return geoAzimuthalEqualArea();
      case 'equi_rectangular':
        return geoEquirectangular();
      case 'mercator':
        return geoMercator();
      default:
        return geoOrthographic();
    }
  }

  async drawMap() {
    this.d3Svg.selectAll('*').remove();

    this.myProjection.rotate([this.yaw, this.xaw]);
    const minMax = this.getMinMax(this.features);

    if (this.indicator.code == 'EG.ELC.ACCS.ZS/mrv=10') {
      this.color = scaleLinear().domain(minMax).range();
    } else {
      this.color = scaleLinear().domain(minMax).range();
    }

    if (this.selectedProjection === 'orthographic') {
      this.d3Svg.append('circle').attr('class', 'foreground').attr('r', 250).attr('transform', `translate(480,350)`);
    } else {
      this.d3Svg
        .append('path')
        .datum(this.graticule.outline)
        .attr('class', 'foreground')
        .attr('d', this.path)
        .attr('transform', `translate(0,100)`);
    }

    this.d3Svg
      .append('g')
      .selectAll('path')
      .data(this.features)
      .enter()
      .append('path')
      .attr('d', this.path)
      .attr('stroke', 'white')
      .attr('country_name', (d) => d['properties']['iso3'])
      .attr('fill', (d) => {
        return d['properties'].value ? (color(d['properties'].value) as never) : 'lightgrey';
      })
      .attr('transform', `translate(0,100)`);

    this.boundaries = await this.addLayer(
      this.boundaries,

      'https://maps.worldbank.org/gspext-api/rest/postgres/admin0boundaries',
      'white',
      'none'
    );
    this.addLayerToSvg(disputedAreas.features, 'white', 'lightgray', 'dashed');
    this.disputed = disputedAreas.features;
    this.addLayerToSvg(borders.features, 'white', 'lightgray', 'dashed');
    this.dashedBorders = borders.features;

    // Legend(color, { title: indicator.legend });

    this.d3Svg
      .on('mousedown', (event) => {
        const pt = pointer(event);
        this.x_old = pt[0];
        this.y_old = pt[1];
        this.mouseDown = true;
        console.log('AAAA');
      })
      .on('mouseup', () => {
        this.mouseDown = false;
      })
      .on('mouseout', () => {
        this.mouseDown = false;
      })
      .on('mousemove', (event) => {
        if (this.mouseDown === true) {
          const pt = pointer(event);
          const x = pt[0];
          const y = pt[1];
          this.yaw += (x - this.x_old) / 5;
          this.xaw += (this.y_old - y) / 5;
          transition()
            .duration(100)
            .tween('rotate', () => {
              return async (t) => {
                await this.drawMap();
              };
            });
        }
      });
  }

  getMinMax(data) {
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < data.length; i++) {
      if (data[i].properties.value < min) {
        min = data[i].properties.value;
      }
      if (data[i].properties.value > max) {
        max = data[i].properties.value;
      }
    }
    return [min, max];
  }

  async addLayer(layerFeatures, url, stroke, fill, clss?) {
    if (layerFeatures) {
      this.addLayerToSvg(layerFeatures, stroke, fill, clss);
      return layerFeatures;
    } else {
      const result = await json(url);
      console.log(result);
      console.log('--------');
      this.addLayerToSvg(result['features'], stroke, fill, clss);
      return result['features'];
    }
  }

  addLayerToSvg(layerFeatures, stroke, fill, clss) {
    if (clss) {
      this.d3Svg
        .append('g')
        .selectAll('path')
        .data(layerFeatures)
        .enter()
        .append('path')
        .attr('d', this.path)
        .attr('class', clss)
        .attr('fill', fill)
        .attr('transform', `translate(0,100)`);
    } else {
      this.d3Svg
        .append('g')
        .selectAll('path')
        .data(layerFeatures)
        .enter()
        .append('path')
        .attr('d', this.path)
        .attr('stroke', stroke)
        .attr('fill', fill)
        .attr('transform', `translate(0,100)`);
    }
  }
}
