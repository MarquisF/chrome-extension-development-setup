<template>
  <md-app
    class='et_display-container edit-mode_size normal-size'
    md-waterfall
    md-mode="fixed"
  >
    <md-app-toolbar class='md-primary md-elevation-4 md-toolbar--header'>
      <div>
        <!-- <popup-header
          back-route='/'
          back-page-name='Home'
          page-title='Display'
        ></popup-header> -->
        <md-button class='md-button--default-in-header' v-on:click='goBack'>Cancel</md-button>
      </div>
      <div class='header__button-group'>
        <md-button
          class='md-icon-button md-primary md-icon-button--common'
          v-on:click='exportImages'
          v-if='!isPackingImages'
        >
          <i class="iconfont icon-imgdownload"></i>
        </md-button>
        <div class="header-button__spin-container" v-else>
          <md-progress-spinner
            class="md-accent"
            :md-diameter="20"
            :md-stroke="3"
            md-mode="indeterminate"
          >
          </md-progress-spinner>
        </div>
        <md-button
          class='md-icon-button md-primary md-icon-button--common'
          v-on:click='exportPDF'
          :disabled='unableToExportPDF()'
          v-if='!isTakingPDF'
        >
          <i class="iconfont icon-pdfdownload"></i>
        </md-button>
        <div class="header-button__spin-container" v-else>
          <md-progress-spinner
            class="md-accent"
            :md-diameter="20"
            :md-stroke="3"
            md-mode="indeterminate"
          >
          </md-progress-spinner>
        </div>

        <md-button
          class='md-icon-button md-primary md-icon-button--common'
          v-on:click='deleteImg'
          :disabled='unableToExportPDF()'
        >
          <i class="iconfont icon-delete"></i>
        </md-button>

        <md-button
          class='md-icon-button md-primary md-icon-button--common'
          v-on:click='saveImagesEditing'
          :disabled='!ifEdited'
        >
          <i class="iconfont icon-save"></i>
        </md-button>
      </div>
    </md-app-toolbar>
    <md-app-content>
      <div class='et_display__select-operations'>
        <md-checkbox
          v-model="ifAllAreSelected"
          @change='selectAll'
        >Select All</md-checkbox>
        <span class='et_display__select-operations__ratio'>{{`${selectedAmount}/${editingOrder.length}`}}</span>
      </div>
      <section id="et_imageList" class='et_image-list'>
        <draggable
          v-model="editingOrder"
          @start="drag=true"
          @end="drag=false"
          class='dragging-container'
        >
          <div v-for="index in editingOrder" :key="index" class='dragging-item'>
            <div>
            <img v-bind:src='getImgSrc(index)' :ref='`image-${index}`' />
            <md-checkbox v-model="imagesSelected[index]" class='image-checkbox'></md-checkbox>
          </div>

          </div>

        </draggable>
      </section>
      <div class="et_size-opt">
        <md-button class="md-raised md-primary" v-on:click='editingZoomIn'>+</md-button>
        <md-button class="md-raised md-primary" v-on:click='editingZoomOut'>-</md-button>
      </div>
    </md-app-content>
  </md-app>
</template>

<script>

import Vue from 'vue';
import jsPDF from 'jspdf';

import Head from 'Components/common/Head';
import BackgroundProtocol from 'BackgroundProtocol';
import api from 'Popup/backgroundApi';
import Sortable from 'sortablejs';
import draggable from 'vuedraggable';
import JSZip from 'jszip';
import JSZipUtils from 'jszip-utils';
import saveAs from 'file-saver';

import { counterFormat, convertSecondsToMS, getTimeMinuteSecond, getCurrentWindowActiveTabId, getApproximateTime } from 'Utils';
import router from '../router';

export default {
  name: 'Display',
  data() {
    return {
      ...this.getInitialData(),
      /**
       * 选择播放模式，
       * REVIEW: 供交互设计人员回顾用户行为
       * DEMO
       * @type {[type]}
       */
      mode: 'DEMO',
      editModeEnabled: false
    };
  },

  computed: {
    getStoryDetails() {
      return this.$store.state.storyDetails.order;
    },

    getImgSrc() {
      const { images } = this.$store.state.storyDetails;
      return item => {
        return `filesystem:${window.location.origin}/persistent/${this.$route.params.id}/${images[item].fileName}`;
      }
    },

    ifAllAreSelected: {
      get: function() {
        const keys = Object.keys(this.imagesSelected);
        for (let i = 0; i < keys.length; i ++) {
          if (this.imagesSelected[keys[i]] === false) {
            return false;
          }
        }
        return true;
      },
      set: function() {}
    },

    selectedAmount() {
      let amount = 0;
      const keys = Object.keys(this.imagesSelected);

      for (let i = 0; i < keys.length; i ++) {
        if (this.imagesSelected[keys[i]] === true) {
          amount ++;
        }
      }
      return amount;
    }

  },

  watch: {
    getStoryDetails(newOrder) {
      this.editingOrder = newOrder.slice();

      newOrder.forEach( key => {
        this.$set(this.imagesSelected, key, true);
      });
    },

    imagesSelected: {
      handler: function (newVal, oldVal) {
        console.info('value changed ', newVal)
        // this.$emit('e1', newVal)
      },
      // immediate: true,
      deep: true
    },

    editingOrder: {
      handler(newValue, oldValue) {
        this.ifEdited = !this.$store.state.storyDetails.order.every(( item, index ) => {
          return newValue[index] === item;
        });
      },
      deep: true
    }
  },

  methods: {
    getInitialData() {
      return {
        story: {},
        images: {},
        order: [],
        editingOrder: [],
        selectedImgs: [],
        imagesSelected: {},
        ifEdited: false,
        isTakingPDF: false,
        isPackingImages: false
      }
    },

    unableToExportPDF() {
      const keys = Object.keys(this.imagesSelected);

      for (let i = 0; i < keys.length; i ++) {
        const key = keys[i];
        if (this.imagesSelected[key]) {
          return false;
        }
      }
      return true;
    },

    get() {
      this.$store.dispatch('storyDetails/getAll', {storyId: this.$route.params.id});
    },

    selectAll() {
      const targetValue = this.ifAllAreSelected ? false : true;
      const keys = Object.keys(this.imagesSelected);
      keys.forEach( key => {
        this.imagesSelected[key] = targetValue;
      });
    },

    disableEditingMode: function() {
      this.editModeEnabled = false;
      this.$refs['imageListContainer'].innerHTML = '';
    },

    editingZoomIn: function() {
      // We increase the width of each of these elements by 20 pixels
      const list = document.querySelectorAll('.dragging-item');

      const theFirstElement = list[0];
      const resultAfterAdded20px = theFirstElement.offsetWidth + 60;
      const newSize = resultAfterAdded20px > 774 ? 774 : resultAfterAdded20px;

      list.forEach( item => {
        item.style.width = `${newSize}px`;
      });
    },

    editingZoomOut() {
      // We reduce the width of each of these elements by 20 pixels
      const list = document.querySelectorAll('.dragging-item');

      list.forEach( item => {
        item.style.width = `${item.offsetWidth - 60}px`;
      });
    },

    deleteImg() {
      const selectedIds = Object.keys(this.imagesSelected);
      selectedIds.forEach( id => {
        if (this.imagesSelected[id]) {
          const index = this.editingOrder.indexOf(parseInt(id));
          this.editingOrder.splice(index, 1);
          Vue.delete(this.imagesSelected, id);
        }
      });
    },

    saveImagesEditing: async function() {
      const { order, story, images } = this.$store.state.storyDetails;
      const updateData = {
        ...story,
        order: this.editingOrder
      };

      await api.command(BackgroundProtocol.UPDATE_STORY, updateData);
      if (this.editingOrder.length !== order.length) {
        const deletedIds = [];
        order.forEach( item => {
          !this.editingOrder.includes(item) && deletedIds.push(item);
        })
        await api.command(BackgroundProtocol.REMOVE_FILES, deletedIds.map( id => {
          return {
            id,
            name: `${this.$route.params.id}/${images[id].fileName}`
          }
        }));
        this.get();
      }
    },

    toDataURL: function(url) {
      return Promise.resolve({
        then: resolve => {
          var xhr = new XMLHttpRequest();
          xhr.onload = function() {
            var reader = new FileReader();
            reader.onloadend = function() {
              resolve(reader.result);
            }
            reader.readAsDataURL(xhr.response);
          };
          xhr.open('GET', url);
          xhr.responseType = 'blob';
          xhr.send();
        }
      })
    },

    exportImages: async function() {
      this.isPackingImages = true;
      const { story } = this.$store.state.storyDetails;

      const zip = new JSZip();
      await this.iterateSelectedImages( async imgId => {
        const b64Data = (await this.fromImgIdToDataUrl(imgId)).split(',')[1];
        var byteCharacters = atob(b64Data);
        var byteNumbers = new Array(byteCharacters.length);
        for (var i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        var byteArray = new Uint8Array(byteNumbers);
        var blob = new Blob([byteArray], {type: 'image/png'});
        zip.file(`${story.name}/${imgId}.png`, blob, {binary:true});
      });
      zip.generateAsync({type: "blob"}).then(function callback(blob) {
        saveAs(blob, `${story.name}_images.zip`);
      });
      this.isPackingImages = false;
    },

    exportPDF: async function() {
      this.isTakingPDF = true;
      const { images, story } = this.$store.state.storyDetails;

      const pdf = new jsPDF('l', 'mm', [297, 210]);
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgMaxWidth = pageWidth;
      const TITLE_HEIGHT = 6;
      const HYPERLINK_HEIGHT = 15;
      const IMAGE_MARGIN_BOTTOM = 7;
      const imgMaxHeight = pageHeight - TITLE_HEIGHT - HYPERLINK_HEIGHT;
      const limitRatio = imgMaxWidth / imgMaxHeight;
      const addImageToPDF = async (imgId, top) => {
        const imgDom = this.$refs[`image-${imgId}`][0];
        const imgRatio = imgDom.clientWidth / imgDom.clientHeight;
        let imgHeight, imgWidth, imgLeft = 0;
        if (limitRatio > imgRatio) {
          imgHeight = imgMaxHeight;
          imgWidth = imgMaxHeight * imgRatio;
          imgLeft = (pageWidth - imgWidth) / 2;
        } else {
          imgWidth = imgMaxWidth;
          imgHeight = imgMaxWidth / imgRatio;
        }

        const dataUrl = await this.fromImgIdToDataUrl(imgId);

        pdf.setFontSize(10);
        pdf.setTextColor(46, 99, 217);
        pdf.textWithLink(`Page url: ${images[imgId].pageUrl}`, 20, top + imgHeight + IMAGE_MARGIN_BOTTOM, { url: images[imgId].pageUrl });
        pdf.addImage(dataUrl, 'PNG', imgLeft, top, imgWidth, imgHeight, null, null);
      }

      // pdf.setFont('Avenir');
      // pdf.setFontSize(14);
      // pdf.text( 5, 10, `Story: ${this.story.name}`);

      // Add page and image
      let pageNumber = 1;
      await this.iterateSelectedImages( async imgId => {
        pageNumber > 1 && pdf.addPage();
        // print pageNumber
        pdf.setFontSize(10);
        pdf.setTextColor(120, 120, 120);
        const pageNumberTop = pageHeight - HYPERLINK_HEIGHT + IMAGE_MARGIN_BOTTOM;
        pdf.text( pageWidth - 20, pageNumberTop, `Page ${pageNumber}`);

        await addImageToPDF(imgId, TITLE_HEIGHT);
        pageNumber ++;
      });

      // pdf.addHTML(10, 10, 'This is a test')
      // pdf.autoPrint();
      this.isTakingPDF = false;
      pdf.save(`Paipai-${story.name}.pdf`);
    },

    /**
     * Iterate the selected images.
     * @param  {Function} callback - async (imgId, index) => {...}
     * @return {undefined}
     */
    iterateSelectedImages: async function(callback) {
      for (let i = 0; i < this.editingOrder.length; i ++) {
        const item = this.editingOrder[i];
        if (this.imagesSelected[item]) {
          typeof callback === 'function' && await callback(item, i);
        }
      }
    },

    /**
     * [description]
     * @param  {[type]} imgId [description]
     * @return {String}       - base64 of the image.
     */
    fromImgIdToDataUrl: async function(imgId) {
      return await this.toDataURL(this.getImgSrc(imgId));
    },

    goDemo: function() {
      const data = {
        story: this.story,
        images: this.images,
        order: this.order
      };
      api.command(BackgroundProtocol.GO_DEMO, data);
    },

    goBack () {
      this.$router.replace(`/new/${this.$route.params.id}`);
    }

  },

  props: ['id'],

  mounted: async function() {
    window.t = this;
    this.get();
  },

  destroyed() {
    this.$store.commit('storyDetails/remove');
  },

  updated() {
    // this.editImages();
  },

  destroyed: async function() {
  },

  components: {
    'popup-header': Head,
    draggable
  }
}
</script>

<style lang="scss" scoped>
#et_imageList.et_image-list {
  /*display: flex;
  flex-wrap: wrap;*/
}

.et_event-displaying-cover {
  display: none;
}

.et_display-container {
  display: flex;
  flex-direction: column;
}

.edit-mode_size {
  width: 600px;
  height: 568px;
}

.et_display-container * {
  box-sizing: border-box;
}

.et_display-container article {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
}

.et_display-container header {
  height: 30px;
  min-height: 30px;
  line-height: 30px;
  padding: 0 20px;
  box-shadow: 0px 1px 4px #aaa;
  z-index: 1;
  display: flex;
  justify-content: space-between;
}

.et_display-container header h2 {
  margin: 0;
  font-weight: normal;
}

.et_display-container header a {
  margin-left: 5px
}

.et_size-opt {
  position: absolute;
  bottom: 20px;
  display: flex;
  flex-direction: column;
  right: 35px;
  width: 30px;

  button.md-button.md-theme-default.md-primary {
    background-color: #00000099;
    margin: 0;
    min-width: 0;
    height: 30px;
    margin-bottom: 2px;
  }
}

.dragging-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-around;
}

.dragging-item {
  position: relative;
  width: 234px;
  margin: 10px;
  border: solid 2px #c5c5cc;
}

.image-checkbox {
  position: absolute;
  top: 7px;
  right: 7px;
  background: #fff;
}

.md-checkbox-label.checkbox-label {
  display: block;
  position: absolute;
  z-index: 100;
}

.et_display__select-operations {
  display: flex;
  justify-content: space-between;
  margin-top: -15px;
  margin-bottom: -15px;
}

.et_display__select-operations__ratio {
  margin: 16px 0;
}

.header-button__spin-container {
  width: 30px;
  height: 30px;
  display: flex;
  justify-content: center;
  align-items: center
}

</style>
<style>
.et_image-list {
  overflow-y: auto;
}

.et_image-list-editor-hint {
  height: 25px;
  line-height: 25px;
  background: #f2f2f5;
  color: #8a8a8a;
}

.et_imageList-container {
  display: inline-block;
  margin: 0 auto;
}

.et_image-list-item {
  width: 100%;
  margin: 10px auto;
  border-radius: 6px;
  overflow: hidden;
}

.et_image-list-item img {
  width: 100%;
  border: solid 2px #c5c5cc;
  box-sizing: border-box;
}

#et_imageList .et_image-list-item {
  display: inline-block;
  margin: 10px;
  /*width: 380px;*/
  width: 234px;
}

.image-list_drag-ghost {
  opacity: .7
}

.image-list_drag-chosen {
  opacity: .4;
}

.et_size-opt .md-button-content {
  font-size: 20px;
}

.md-button-content {
  font-size: 20px;
}

.md-checkbox .md-checkbox-container input {
  left: 0;
  opacity: 0;
}

</style>
