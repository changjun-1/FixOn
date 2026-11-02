const session = require("express-session");
// Shared SQL storage keeps login sessions valid across Vercel instances.
class MySQLSessionStore extends session.Store {
  constructor(model) { super(); this.model = model; }
  expires(data) { return data.cookie?.expires ? new Date(data.cookie.expires) : new Date(Date.now() + 4 * 60 * 60 * 1000); }
  get(sid, callback) {
    this.model.findByPk(sid).then(async row => {
      if (!row) return null;
      if (new Date(row.expires) <= new Date()) { await row.destroy(); return null; }
      return JSON.parse(row.data);
    }).then(data => callback(null, data), callback);
  }
  set(sid, data, callback = () => {}) {
    this.model.upsert({ sid, data: JSON.stringify(data), expires: this.expires(data) }).then(() => callback(), callback);
  }
  destroy(sid, callback = () => {}) { this.model.destroy({ where: { sid } }).then(() => callback(), callback); }
  touch(sid, data, callback = () => {}) { this.model.update({ expires: this.expires(data) }, { where: { sid } }).then(() => callback(), callback); }
  clear(callback = () => {}) { this.model.destroy({ where: {} }).then(() => callback(), callback); }
}
module.exports = { MySQLSessionStore };
