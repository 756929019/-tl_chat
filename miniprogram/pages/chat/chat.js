// miniprogram/pages/chat/chat.js
/* 聊天窗口
 * 其中54px为回复框高度，css同
 * mode true为文本，false为语音
 * cancel true为取消录音，false为正常录音完毕并发送
 * 上拉超过50px为取消发送语音
 * status 0为normal，1为pressed，2为cancel
 * hud的尺寸是150*150
 */
var windowWidth = wx.getSystemInfoSync().windowWidth;
var windowHeight = wx.getSystemInfoSync().windowHeight;
var keyHeight = 0;

var utils = require('../../utils/utils.js');
Page({
  data: {
    userInfo:{},
    headLeft: 'images/robothead.png',
    headRight:'images/userhead.png',
    message_list: [],
    page_index: 0,
    mode: true,
    cancel: false,
    status: 0,
    tips: ['按住 说话', '松开 结束', '取消 发送'],
    state: {
      'normal': 0,
      'pressed': 1,
      'cancel': 2
    },
    toView: '',
    content:'',
    scroll_height: '90vh',
    inputBottom: 0
  },
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function () {
    let that = this
    wx.getUserInfo({
      success: function (e) {
        console.log(e.userInfo);
        let header = e.userInfo.avatarUrl
        that.setData({
          userInfo: e.userInfo,
          headRight: header
        })
        var msg = {
          myself: 0,
            head_img_url: 'images/robothead.png',
            'msg_type': 'text',
            'content': '来了老' + (e.userInfo.gender==1?'弟':'妹') + ',好嗨哟',
            create_time: utils.formatTime(new Date())
        }
        that.data.message_list.push(msg);
        that.setData({
          message_list: that.data.message_list
        })
      }
    })
  },
  reply: function (e) {
    let that = this;
    var content = e.detail.value;
    if (content == '') {
      wx.showToast({
        title: '总要写点什么吧'
      });
      return;
    }
    var message_list = this.data.message_list;
    var message = {
      myself: 1,
      head_img_url: this.data.headRight,
      'msg_type': 'text',
      'content': content
    }
    message_list.push(message);
    this.setData({
      message_list: message_list,
      content: '' // 清空输入框文本
    })
    this.scrollToBottom();
    wx.request({
      url: 'https://openapi.tuling123.com/openapi/api/v2',
      method: 'POST',
      data:{
        "reqType": 0,
        "perception": {
          "inputText": {
            "text": content
          }
        },
        "userInfo": {
          "apiKey": "c916fb0d9e43403dbd59b622062cd722",
          "userId": "111"
        }
      },
      success: function (res) {
        that.msgCallback(that, res);
      }
    })
  },
  msgCallback: function (that,res) {
    console.log(res);
    let tuling_say = res.data.results;
    for (var i = 0; i < tuling_say.length; i++) {
      var type ="text";
      var msg = "";
      if (tuling_say[i].resultType == "text") {
        msg = tuling_say[i].values.text;
      } else if (tuling_say[i].resultType == "url") {
        msg = tuling_say[i].values.url;
      } else if (tuling_say[i].resultType == "voice") {
        msg = tuling_say[i].values.voice;
      } else if (tuling_say[i].resultType == "video") {
        msg = tuling_say[i].values.video;
      } else if (tuling_say[i].resultType == "image") {
        msg = tuling_say[i].values.image;
      } else if (tuling_say[i].resultType == "news") {
        var news = tuling_say[i].values.news;
        msg = news;
        type = "news";
      } else {
        msg += tuling_say[i].values.text;
      }
      var message = {
        myself: 0,
        head_img_url: that.data.headLeft,
        'msg_type': type,
        'content': msg
      }
      that.data.message_list.push(message);
    }
    that.setData({
      message_list: that.data.message_list
    });
    that.scrollToBottom();
    console.log(that.data.message_list);
  },
  chooseImage: function () {
    // 选择图片供上传
    wx.chooseImage({
      count: 9,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'], // 可以指定来源是相册还是相机，默认二者都有
      success: res => {
        // 返回选定照片的本地文件路径列表，tempFilePath可以作为img标签的src属性显示图片
        var tempFilePaths = res.tempFilePaths;
        // console.log(tempFilePaths);
        // 遍历多图
        tempFilePaths.forEach((tempFilePath) => {
          this.upload(tempFilePath, 'image');
        });
      }
    })
  },
  preview: function (e) {
    // 当前点击图片的地址
    var src = e.currentTarget.dataset.src;
    // 遍历出使用images
    var images = [];
    this.data.message_list.forEach(function (messasge) {
      if (messasge != null && messasge.msg_type == 'image') {
        images.push(messasge.content);
      }
    });
    // 预览图片
    wx.previewImage({
      urls: images,
      current: src
    });
  },
  switchMode: function () {
    // 切换语音与文本模式
    this.setData({
      mode: !this.data.mode
    });
  },
  record: function () {
    let that = this;
    // 录音事件
    wx.startRecord({
      success: function (res) {
        if (!that.data.cancel) {
          that.upload(res.tempFilePath, 'voice');
        }
      },
      fail: function (res) {
        console.log(res);
        //录音失败

      },
      complete: function (res) {
        console.log(res);

      }
    })
  },
  stop: function () {
    wx.stopRecord();
  },
  touchStart: function (e) {
    // 触摸开始
    var startY = e.touches[0].clientY;
    // 记录初始Y值
    this.setData({
      startY: startY,
      status: this.data.state.pressed
    });
  },
  touchMove: function (e) {
    // 触摸移动
    var movedY = e.touches[0].clientY;
    var distance = this.data.startY - movedY;
    // console.log(distance);
    // 距离超过50，取消发送
    this.setData({
      status: distance > 50 ? this.data.state.cancel : this.data.state.pressed
    });
  },
  touchEnd: function (e) {
    // 触摸结束
    var endY = e.changedTouches[0].clientY;
    var distance = this.data.startY - endY;
    // console.log(distance);
    // 距离超过50，取消发送
    this.setData({
      cancel: distance > 50 ? true : false,
      status: this.data.state.normal
    });
    // 不论如何，都结束录音
    this.stop();
  },
  upload: function (tempFilePath, type) {
    // 开始上传
    wx.showLoading({
      title: '发送中'
    });
    // 语音与图片通用上传方法
    var formData = {
      third_session: wx.getStorageSync('third_session'),
      mpid: this.data.mpid,
      fans_id: this.data.to_uid,
      msg_type: type,
    };
    // console.log(tempFilePath);
    var message_list = this.data.message_list;
    var message = {
      myself: 1,
      head_img_url: 'images/userhead.png',
      'msg_type': type,
      'content': tempFilePath,
      create_time: utils.formatTime(new Date())
    };
    message_list.push(message);
    this.setData({
      message_list: message_list
    })
    this.scrollToBottom()
    setTimeout(() => {
      wx.hideLoading();
    }, 500)
  },
  scrollToBottom: function () {
    this.setData({
      toView: 'row_' + (this.data.message_list.length - 1)
    });
  },
  /**
  * 获取聚焦
  */
  focus: function (e) {
    keyHeight = e.detail.height;
    this.setData({
      scroll_height: (windowHeight  - keyHeight) + 'px',
      inputBottom: keyHeight + 'px'
    });
    console.log(this.data.scroll_height);
    console.log(this.data.inputBottom);
  },

  //失去聚焦(软键盘消失)
  blur: function (e) {
    this.setData({
      scroll_height: '90vh',
      inputBottom: 0
    })
    console.log(this.data.scroll_height);
    console.log(this.data.inputBottom);
  },
  copy: function (e) {
    var that = this;
    var _data = e.currentTarget.dataset.content;
    console.log(e);
    wx.setClipboardData({
      data: _data,
      success: function (res) {
        wx.showToast({
          title: '复制成功',
        });
      }
    });
  },
})