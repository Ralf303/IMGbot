const clothes = require("./clothes.js");
const sequelize = require("./db.js");
const { User, Item } = require("./models");
const Jimp = require("jimp");

const connectToDb = async () => {
  try {
    await sequelize.authenticate();
    console.log("Connection has been established successfully.");
    await sequelize.sync();
    console.log("All models were synchronized successfully.");
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  }
};

const getUser = async (chatId, firstName, username) => {
  let user = await User.findOne({ where: { chatId } });
  if (!user) {
    user = await User.create({ chatId, firstname: firstName, username });
  } else {
    if (!user.username) {
      user = await user.update({ username });
    }
    if (!user.firstname) {
      user = await user.update({ firstname: firstName });
    }
  }
  return user;
};

async function blendImages(imagePaths) {
  const bg = await Jimp.read("img/bg.jpg");
  for (let i = 0; i < imagePaths.length; i++) {
    const fg = await Jimp.read(imagePaths[i]);
    const y = 0;
    const x = 0;

    bg.composite(fg, x, y);
  }

  const buffer = await bg.getBufferAsync(Jimp.MIME_JPEG);
  return buffer;
}
const buyItem = async (user, itemInfo, ctx, status) => {
  if (user.slots < user.fullSlots) {
    ctx.reply("Недостаточно слотов😥");
    return;
  }

  if (!itemInfo.canBuy && status) {
    ctx.reply("Эту вещь нельзя купить");
    return;
  }

  const item = await Item.create({
    chatId: user.chatId,
    src: itemInfo.src,
    itemName: itemInfo.name,
    bodyPart: itemInfo.bodyPart,
    isWorn: false,
  });

  user.fullSlots++;
  await user.addItem(item);
  await ctx.reply(`Вы купили: ${item.itemName}[${item.id}]`);
  await user.save();
  await item.save();
};

const deleteItem = async (user, id, ctx) => {
  const item = await Item.findOne({
    where: {
      id: id,
      userId: user.id,
    },
  });
  if (!item) {
    ctx.reply(`У вас нет такой вещи`);
    return;
  }
  ctx.reply(`Успешно удалена вещь ${item.itemName}[${item.id}]`);
  user.fullSlots--;
  await item.destroy();
};

const deleteAllItems = async (user, ctx) => {
  const items = await Item.findAll({
    where: {
      userId: user.id,
    },
  });
  if (!items.length) {
    ctx.reply("У вас нет вещей");
    return;
  }
  ctx.reply(`Успешно удалены все вещи пользователя`);
  user.fullSlots = 0;
  await Item.destroy({
    where: {
      userId: user.id,
    },
  });
  user.save();
};

const transferItem = async (sender, id, ctx) => {
  try {
    const message = ctx.message.reply_to_message;

    if (!message) {
      return;
    }

    const receiverChatId = message.from.id;

    // проверяем, что отправитель не является ботом
    if (message.from.is_bot) {
      ctx.reply("Зачем боту предметы🧐");
      return;
    }

    const receiver = await User.findOne({
      where: { chatId: receiverChatId },
    });

    const item = await Item.findOne({
      where: {
        id: id,
        userId: sender.id,
      },
    });

    if (!item) {
      ctx.reply(`У вас нет такой вещи`);
      return;
    }

    if (receiver.slots <= receiver.fullSlots) {
      ctx.reply(`У ${receiver.firstName} нет места😥`);
      return;
    }

    if (item.isWorn) {
      item.isWorn = false;
    }
    sender.fullSlots--;
    receiver.fullSlots++;
    item.userId = receiver.id;
    ctx.reply(
      `Вы успешно передали ${item.itemName}[${item.id}] @${receiver.username}`
    );

    await sender.save();
    await receiver.save();
    await item.save();
  } catch (error) {
    console.log(error);
  }
};

const removeItem = async (user, id, ctx) => {
  try {
    const item = await Item.findOne({
      where: {
        id: id,
        userId: user.id,
      },
    });

    // проверяем, что указанный предмет существует
    if (!item) {
      ctx.reply("Такой вещи у вас нет");
      return;
    }

    // проверяем, что предмет не надет
    if (!item.isWorn) {
      ctx.reply("Эта вещь и так не надета");
      return;
    }

    // снимаем указанный предмет
    item.isWorn = false;
    await item.save();

    ctx.reply(`Вы сняли ${item.itemName}[${id}]`);
  } catch (error) {
    console.log(error);
    ctx.reply("Что-то пошло не так");
  }
};

const wearItem = async (user, id, ctx) => {
  try {
    const item = await Item.findOne({
      where: {
        id: id,
        userId: user.id,
      },
    });

    // проверяем, что указанный предмет существует
    if (!item) {
      ctx.reply("Такой вещи у вас нет");
      return;
    }

    // проверяем, что предмет еще не надет
    if (item.isWorn) {
      ctx.reply("Эта вещь уже надета");
      return;
    }

    // проверяем, что указанный слот еще свободен
    const bodyPart = item.bodyPart;
    const wornItem = await Item.findOne({
      where: {
        userId: user.id,
        bodyPart: bodyPart,
        isWorn: true,
      },
    });

    if (wornItem) {
      // если на указанном слоте уже есть другая надетая вещь, снимаем ее
      wornItem.isWorn = false;
      await wornItem.save();
    }

    // надеваем указанный предмет
    item.isWorn = true;
    await item.save();

    ctx.reply(`Вы надели ${item.itemName}[${id}]`);
  } catch (error) {
    console.log(error);
    ctx.reply("Что-то пошло не так");
  }
};

const getWornItems = async (user, ctx) => {
  try {
    const items = await Item.findAll({
      where: {
        userId: user.id,
        isWorn: true,
      },
    });

    // формируем массив с названиями вещей и их идентификаторами
    const wornItems = items.map((item) => `${item.itemName}[${item.id}]`);
    const src = items.map((item) => `${item.src}`);
    // если список надетых вещей пустой, возвращаем сообщение об этом
    if (wornItems.length === 0) {
      await ctx.replyWithPhoto(
        { source: "img/bg.jpg" },
        { caption: `На вас ничего не надето` }
      );
      return;
    }
    const rows = [];
    for (let i = 0; i < wornItems.length; i += 2) {
      let row = wornItems[i];
      if (i + 1 < wornItems.length) {
        row += `, ${wornItems[i + 1]}`;
      }
      rows.push(row);
    }
    // возвращаем список надетых вещей
    await ctx.replyWithPhoto(
      { source: await blendImages(src) },
      { caption: `На вас надето:\n${rows.join("\n")}` }
    );
    return;
  } catch (error) {
    console.log(error);
    ctx.reply("Что-то пошло не так");
  }
};

const getInventory = async (user, ctx) => {
  const items = await user.getItems();
  const itemNames = items.map((item) => `${item.itemName}[${item.id}]`);
  const rows = [];
  for (let i = 0; i < itemNames.length; i += 2) {
    let row = itemNames[i];
    if (i + 1 < itemNames.length) {
      row += `, ${itemNames[i + 1]}`;
    }
    rows.push(row);
  }
  await ctx.reply(`Ваш инвентарь:\n${rows.join("\n")}`);
};

function shopGenerator(id, ctx) {
  let result;
  if (id === 1) {
    result = "Магазин одежды\n\n";
    let i = 1;
    for (const item in clothes) {
      if (clothes[item].class === "low") {
        result += `${i}) ${clothes[item].name}[${item}] Цена: ${clothes[item].price}\n`;
        i++;
      }
    }
  }

  if (id === 2) {
    result = 'Магазин "Paul Shop"\n\n';
    let i = 1;
    for (const item in clothes) {
      if (clothes[item].class === "middle") {
        result += `${i}) ${clothes[item].name}[${item}] Цена: ${clothes[item].price}\n`;
        i++;
      }
    }
  }

  if (id === 3) {
    result = 'Магазин "clemente house"\n\n';
    let i = 1;
    for (const item in clothes) {
      if (clothes[item].class === "elite") {
        result += `${i}) ${clothes[item].name}[${item}] Цена: ${clothes[item].price}\n`;
        i++;
      }
    }
  }

  if (id === 4) {
    result = "Магазин бомж геньг\n\n";
    let i = 1;
    for (const item in clothes) {
      if (clothes[item].class === "vip") {
        result += `${i}) ${clothes[item].name}[${item}] Цена: ${clothes[item].price}\n`;
        i++;
      }
    }
  }
  ctx.reply(
    result + '\n\nЧтобы купить товар напишите команду "Покупка {id вещи}"'
  );
  return;
}

module.exports = {
  connectToDb,
  getUser,
  buyItem,
  deleteItem,
  transferItem,
  deleteAllItems,
  wearItem,
  getWornItems,
  getInventory,
  removeItem,
  shopGenerator,
};
