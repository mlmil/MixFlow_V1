import { StageInputNode } from './StageInputNode.js';
import { USBSendMatrixNode } from './USBSendMatrixNode.js';
import { AbletonLiveNode } from './AbletonLiveNode.js';
import { ChannelStripNode } from './ChannelStripNode.js';
import { OutputBusNode } from './OutputBusNode.js';

export const NodeRegistry = {
  input: StageInputNode,
  usb_send: USBSendMatrixNode,
  daw: AbletonLiveNode,
  strip: ChannelStripNode,
  bus: OutputBusNode,
  main: OutputBusNode,

  get(category) {
    return this[category] || null;
  },

  create(category, options) {
    const ClassObj = this[category];
    if (!ClassObj) {
      throw new Error(`Unknown node category: ${category}`);
    }
    return new ClassObj(options);
  },

  deserialize(data) {
    const category = data.category;
    const ClassObj = this[category];
    if (!ClassObj) {
      return null;
    }

    if (typeof ClassObj.fromJSON === 'function') {
      return ClassObj.fromJSON(data);
    }

    const options = {
      ...(data.properties || {}),
      id: data.id,
      title: data.title,
      category: data.category,
      x: data.x,
      y: data.y
    };

    return new ClassObj(options);
  }
};
