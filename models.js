const sequelize = require("./db.js");
const { DataTypes } = require("sequelize");

const User = sequelize.define("user", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    unique: true,
    autoIncrement: true,
  },
  chatId: { type: DataTypes.STRING, unique: true },
  username: { type: DataTypes.STRING },
  firstname: { type: DataTypes.STRING },
  balance: { type: DataTypes.INTEGER, defaultValue: 0 },
  slots: { type: DataTypes.INTEGER, defaultValue: 10 },
  fullSlots: { type: DataTypes.INTEGER, defaultValue: 0 },
});

const Item = sequelize.define("item", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    unique: true,
    autoIncrement: true,
  },
  src: { type: DataTypes.STRING },
  itemName: { type: DataTypes.STRING },
  bodyPart: { type: DataTypes.STRING },
  isWorn: { type: DataTypes.BOOLEAN, defaultValue: false },
});

User.hasMany(Item, { as: "items" });

module.exports = { User, Item };
