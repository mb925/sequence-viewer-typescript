import { OptionsModel } from './models/options.model';
import {RowsModel} from './models/rows.model';
import {ColorsModel} from './models/colors.model';
import {Log} from './models/log.model';
import {SelectionModel} from './models/selection.model';
import {IconsModel} from './models/icons.model';
import {SequenceInfoModel} from './models/sequenceInfoModel';
import {EventsModel} from './models/events.model';
import {PatternsModel} from './models/patterns.model';
import {InputModel} from './models/input.model';
import {ConsensusModel} from './models/consensus.model';
import {Palettes} from './palettes/palettes';

export class SequenceViewer {
  static sqvList = [];
  divId: string;
  init: boolean;
  input: InputModel;
  params: OptionsModel;
  rows: RowsModel;
  consensus: ConsensusModel;
  regions: ColorsModel;
  patterns: PatternsModel;
  icons: IconsModel;
  labels: SequenceInfoModel;
  selection: SelectionModel;
  events: EventsModel;

  constructor(divId?: string ) {
    this.divId = divId;
    this.init = false;
    this.input = new InputModel();
    this.params = new OptionsModel();
    this.rows = new RowsModel();
    this.consensus = new ConsensusModel();
    this.regions = new ColorsModel();
    this.patterns = new PatternsModel();
    this.icons = new IconsModel();
    this.labels = new SequenceInfoModel();
    this.selection = new SelectionModel();
    this.events = new EventsModel();

    window.onresize = () => {
      for (const id of SequenceViewer.sqvList) {

        const sqvBody = document.getElementById(id);
        if (!sqvBody) { Log.w(1, 'Cannot find sqv-body element.'); continue; }

        const chunks = sqvBody.getElementsByClassName('chunk');
        if (!chunks) { Log.w(1, 'Cannot find chunk elements.'); continue; }

        let oldTop = 0;
        let newTop;
        // tslint:disable-next-line:prefer-for-of
        for (let i = 0; i < chunks.length; i++) {
            newTop = chunks[i].getBoundingClientRect().top;
            if (newTop > oldTop) {
              chunks[i].firstElementChild.className = 'index';
              oldTop = newTop;
            } else {
              chunks[i].firstElementChild.className = 'index hidden';
            }
          }
      }
    };
  }

  public drawSequenceViewer(input1?, input2?, input3?, input4?, input5?, input6?, input7?) {

    SequenceViewer.sqvList.push(this.divId);

    let inputs;
    let order;
    let labels;
    let startIndexes;
    let tooltips;
    let data;

    /** check and process input */
    [inputs, order] = this.input.process(input1, input2, input3, input4, input5, input6, input7);

    /** check and process parameters input */
    inputs.options = this.params.process(inputs.options);

    /** check and consensus input */
    [inputs.sequences, inputs.regions, order ] = this.consensus.process(inputs.sequences, inputs.regions, inputs.options, order);

    /** check and process patterns input */
    inputs.patterns = this.patterns.process(inputs.patterns, inputs.sequences);

    /** check and process colors input */
    inputs.regions = this.regions.process(inputs, order);

    /** check and process icons input */
    inputs.icons = this.icons.process(inputs.regions, inputs.sequences, inputs.iconsHtml, inputs.iconsPaths);

    /** check and process sequences input */
    data = this.rows.process(inputs.sequences, inputs.icons, inputs.regions, inputs.options.colorScheme);

    /** check and process labels input */
    [ labels, startIndexes, tooltips ] = this.labels.process(inputs.regions, inputs.sequences);

    /** create/update sqv-body html */
    this.createGUI(data, labels, startIndexes, tooltips, inputs.options);

    /** listen copy paste events */
    this.selection.process();

    /** listen selection events */
    this.events.onRegionSelected();
  }

  private generateLabels(idx, labels, startIndexes, topIndexes, chunkSize, fontSize, tooltips, data) {
    let labelshtml = '';
    let labelsContainer = '';
    const noGapsLabels = [];

    if (labels.length > 0) {
      if (topIndexes) {
        labelshtml += `<span class="label-hidden"></span>`;
      }
      let flag;
      let count = -1;
      let seqN = -1;
      for (const seqNum of data) {
        if (noGapsLabels.length < data.length) {
          noGapsLabels.push(0);
        }
        seqN += 1;
        for (const res in seqNum) {
          if (seqNum[res].char && seqNum[res].char.includes('svg')) {
            flag = true;
            break;
          }
        }

        if (flag) {
          noGapsLabels[seqN] = '';
          if (idx) {
            // line with only icons, no need for index
            labelshtml += `<span class="label-hidden"><span class="label"> ${noGapsLabels[seqN]}</span></span>`;
          } else {
            labelshtml += `<span class="label-hidden"><span class="label"></span></span>`;
          }

        } else {
          count += 1;
          if (idx) {
            if (!chunkSize) {
              // lateral index regular
              labelshtml += `<span class="label-hidden" style="width: ${fontSize}">
                            <span class="label" >${(startIndexes[count] - 1) + idx}</span></span>`;
            } else {
              let noGaps = 0;
              for (const res in seqNum) {
                if (+res <= (idx) && seqNum[res].char !== '-') {
                  noGaps += 1;
                }
              }
              // lateral index gap
              noGapsLabels[seqN] = noGaps;
              labelshtml += `<span class="label-hidden" style="width:  ${fontSize}">
                            <span class="label" >${(startIndexes[count] - 1) + noGapsLabels[seqN]}</span></span>`;
            }

          } else {
            labelshtml += `<span class="label-hidden"><span class="label">${labels[count]}${tooltips[count]}</span></span>`;
          }
        }
        flag = false;
      }

      labelsContainer = `<span class="labelContainer" style="display: inline-block">${labelshtml}</span>`;
    }
    return labelsContainer;
  }

  private addTopIndexes(topIndexes, chunkSize, x, maxTop) {

    let cells = '';
    // adding top indexes
    if (topIndexes) {
      let chunkTopIndex;
      if (x % chunkSize === 0 && x <= maxTop) {
        chunkTopIndex = `<span style="-webkit-user-select: none;direction: rtl;display:block;width:0.6em;">${x}</span>`;

      } else {
        chunkTopIndex = `<span style="-webkit-user-select: none;display:block;visibility: hidden;">0</span>`;
      }
      cells += chunkTopIndex;
    }
    return cells;
  }

  private createGUI(data, labels, startIndexes, tooltips, options) {
    console.log(data)

    const sqvBody = document.getElementById(this.divId);
    if (!sqvBody) {
      Log.w(1, 'Cannot find sqv-body element.');
      return;
    }

    const chunkSize = options.chunkSize;
    const fontSize = options.fontSize;
    const spaceSize = options.spaceSize;
    const topIndexes = options.topIndexes;
    const lateralIndexes = options.lateralIndexes;
    const lateralIndexesGap = options.lateralIndexesGap;
    const oneLineSetting = options.oneLineSetting;
    const oneLineWidth = options.oneLineWidth;
    const fNum = +fontSize.substr(0, fontSize.length - 2);
    const fUnit = fontSize.substr(fontSize.length - 2, 2);

    // maxIdx = length of the longest sequence
    let maxIdx = 0;
    let maxTop = 0;
    for (const row of data) {
      if (maxIdx < Object.keys(row).length) { maxIdx = Object.keys(row).length; }
      if (maxTop < Object.keys(row).length) { maxTop = Object.keys(row).length; }
    }

    const lenghtIndex = maxIdx.toString().length;
    const indexWidth = (fNum * lenghtIndex).toString() + fUnit;

    // consider the last chunk even if is not long enough
    if (chunkSize > 0) { maxIdx += (chunkSize - (maxIdx % chunkSize)) % chunkSize; }

    // generate labels
    const labelsContainer = this.generateLabels(false, labels, startIndexes, topIndexes, false, indexWidth, tooltips, data);

    let index = '';
    let cards = '';
    let cell;
    let entity;
    let style;
    let html = '';
    let idxNum = 0;
    let idx;

    for (let x = 1; x <= maxIdx; x++) {
      let cells = this.addTopIndexes(topIndexes, chunkSize, x, maxTop);

      for (let y = 0; y < data.length; y++) {
        entity = data[y][x];
        style = 'font-size: 1em;display:block;height:1em;line-height:1em;';
        if (y === data.length - 1) { style = 'font-size: 1em;'; }
        if (!entity) {
          // emptyfiller
            cell = `<span style="${style}"> </span>`;
        } else {
          if (entity.target) { style += `${entity.target}`; }
          if (entity.char && !entity.char.includes('svg')) {
            // y is the row, x is the column
            cell = `<span class="cell" data-res-x='${x}' data-res-y= '${y}' data-res-id= '${this.divId}'
                    style="${style}">${entity.char}</span>`;
          } else {
            style += '-webkit-user-select: none;';
            cell = `<span style="${style}">${entity.char}</span>`;
          }
        }
        cells += cell;
      }

      cards += `<div class="crd">${cells}</div>`; // width 3/5em to reduce white space around letters
      cells = '';


      if (chunkSize > 0 && x % chunkSize === 0) {
        // considering the row of top indexes
        if (topIndexes) {
        } else {
          idxNum += chunkSize; // lateral index (set only if top indexes missing)
          idx = idxNum - (chunkSize - 1);
        }
        // adding labels
        if (lateralIndexes) {
          const gapsContainer = this.generateLabels(idx, labels, startIndexes, topIndexes, false, indexWidth, false, data);
          if (oneLineSetting) {
            index = gapsContainer;  // lateral number indexes + labels
          } else {
            index = labelsContainer  + gapsContainer;  // lateral number indexes + labels
          }

          } else if (lateralIndexesGap) {
          const gapsContainer = this.generateLabels(idx, labels, startIndexes, topIndexes, chunkSize, indexWidth, false, data);
          if (oneLineSetting) {
            index = gapsContainer;  // lateral number indexes + labels
          } else {
            index = labelsContainer  + gapsContainer;  // lateral number indexes + labels
          }
          } else {
            index = labelsContainer;
          }

        index = `<div class="index hidden">${index}</div>`;
        style = `font-size: ${fontSize};`;

        if (x !== maxIdx) { style += 'padding-right: ' + spaceSize + 'em;'; } else { style += 'margin-right: ' + spaceSize + 'em;'; }

        const chunk = `<div class="chunk" style="${style}">${index}<div class="crds">${cards}</div></div>`;
        cards = '';
        index = '';
        html += chunk;
      }
    }

    if (oneLineSetting) {
      sqvBody.innerHTML = `<div class="root" style="display: flex"><div style="${style}">${labelsContainer}</div>
                        <div style="display:inline-block;overflow-x:scroll;white-space: nowrap;width:${oneLineWidth}"> ${html}</div></div>`;
    } else {
      sqvBody.innerHTML = `<div class="root">${html}</div>`;
    }

    window.dispatchEvent(new Event('resize'));
  }
}
