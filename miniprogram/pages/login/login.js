import { ENV_ID } from "../../env";
import { fenToYuan } from "../../utils/money";
console.log("test money:", fenToYuan(1290));
const db = wx.cloud.database({ env: ENV_ID });

Page({
  data: {
    form: { name: '', wechatName: '', phone: '' },
    openid: ''
  },

  async onLoad() {
    try {
      const res = await wx.cloud.callFunction({ name: 'getOpenid' })
      const openid = res?.result?.openid
      if (!openid) {
        console.error('getOpenid 返回：', res)
        throw new Error('openid 获取失败')
      }

      this.setData({ openid })

      const u = await db.collection('users').where({ openid }).get()
      if (u.data.length) {
        const user = u.data[0]
        this.setData({
          form: { name: user.name, wechatName: user.wechatName, phone: user.phone }
        })
      }
    } catch (err) {
      console.error('登录初始化失败：', err)
      // 失败也没关系，至少页面能让你输入
    }
  },

  onName(e) { this.setData({ 'form.name': e.detail.value }) },
  onWechatName(e) { this.setData({ 'form.wechatName': e.detail.value }) },
  onPhone(e) { this.setData({ 'form.phone': e.detail.value }) },

  async onSave() {
    const { name, wechatName, phone } = this.data.form
    if (!name || !wechatName || !phone) {
      wx.showToast({ title: '请填完整信息', icon: 'none' })
      return
    }
    if (!/^\d{8,15}$/.test(phone)) {
      wx.showToast({ title: '电话格式不对', icon: 'none' })
      return
    }
    if (!this.data.openid) {
      wx.showToast({ title: 'openid 未就绪，请稍后重试', icon: 'none' })
      return
    }

    const openid = this.data.openid
    const now = db.serverDate()

    const old = await db.collection('users').where({ openid }).get()
    if (old.data.length) {
      await db.collection('users').doc(old.data[0]._id).update({
        data: { name, wechatName, phone, updatedAt: now }
      })
    } else {
      await db.collection('users').add({
        data: { openid, name, wechatName, phone, createdAt: now, updatedAt: now }
      })
    }

    wx.reLaunch({ url: '/pages/menu/menu' })
  }
})
