(() => {
  /**
   * 获取时间 时:分 秒.毫秒
   * @param  {某个能被Date解析的类型} time 时间
   * @return {String} 时:分 秒.毫秒
   */
  const getTimeMinuteSecond = time => {
    const date = new Date(time);
    const h = date.getHours();
    let minute = date.getMinutes();
    const s = date.getSeconds();
    const ms = date.getMilliseconds();
    if ( minute.toString().length === 1 ) {
      minute = `0${minute}`
    }
    return `${h}:${minute} ${s}.${ms}s`;
  }

  /**
   * 获取时间 月-日 时:分
   * @param  {某个能被Date解析的类型} time 时间
   * @return {String} 月-日 时:分:秒
   */
  const getApproximateTime = time => {
    const date = new Date(time);
    const month = date.getMonth();
    const theDate = date.getDate()
    const day = date.getDay();
    const h = date.getHours();
    let minute = date.getMinutes();
    const s = date.getSeconds();
    const ms = date.getMilliseconds();

    if ( minute.toString().length === 1 ) {
      minute = `0${minute}`
    }

    return `${month + 1}-${theDate} ${h}:${minute}:${s}`;
  }

  /**
   * 这个方法用来解析无法通过 location.search 访问的 queryString
   * 将 queryString 转换成 键-值 关系对象
   * @return {Object}
   */
  const getQueryBySearch = () => {
    const search = window.location.href.split('?')[1];
    const searchItems = search.split('&');
    const query = {};

    for ( let i = 0; i < searchItems.length; i ++ ) {
      const item = searchItems[i];
      const keyValue = item.split('=');
      const key = keyValue[0];
      const value = keyValue[1];
      query[key] = value;
    }

    return query;
  }

  /**
   * 这个方法用来将整数秒转换成 分钟:秒 的字符串格式
   * @param  {Number} seconds 整数秒
   * @return {String}         "分钟:秒" 字符串
   */
  const convertSecondsToMS = seconds => {

    const newMinutes = Math.floor(seconds / 60);
    const newSeconds = seconds % 60;

    return `${newMinutes}:${newSeconds}`;
  }

  const counterFormat = tstamp => {
    const totalSeconds = Math.floor(tstamp / 1000);
    let minutes = Math.floor(totalSeconds / 60).toString();
    let seconds = (totalSeconds % 60).toString();

    if ( minutes.length <= 1 ) {
      minutes = `0${minutes}`;
    }
    if ( seconds.length <= 1 ) {
      seconds = `0${seconds}`;
    }

    return `${minutes}:${seconds}`;
  }

  function getCurrentWindowActiveTabId() {
    return new Promise((resolve) => {
      chrome.tabs.query({
        active: true
      }, res => {
        resolve(res[0].id)
      })
    })
  }

  const sendMsg = async function(msg, callback) {
    const tabId = await getCurrentWindowActiveTabId();
    return new Promise( resolve => {
      chrome.tabs.sendMessage(tabId, msg, res => resolve(res));
    });
  }




  const appUtils = {
    getTimeMinuteSecond,
    getApproximateTime,
    getQueryBySearch,
    convertSecondsToMS,
    counterFormat,
    getCurrentWindowActiveTabId,
    sendMsg
  };

  if (exports === 'undefined') {
    window.appUtils = appUtils;
  } else {
    module.exports = appUtils;
  }

})();
