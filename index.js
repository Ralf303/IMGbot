const { Telegraf } = require("telegraf");
const { Keyboard, Key } = require("telegram-keyboard");

const {
  connectToDb,
  getUser,
  deleteItem,
  transferItem,
  deleteAllItems,
  wearItem,
  getWornItems,
  getInventory,
  removeItem,
  buyItem,
  shopGenerator,
} = require("./utils");
const clothes = require("./clothes");
const bot = new Telegraf("5991692245:AAFar72sO2p1EdvjHr48qA7N0gMaP4vBk2g");

const start = async () => {
  await connectToDb();

  bot.on("text", async (ctx) => {
    try {
      const user = await getUser(
        ctx.from.id,
        ctx.from.first_name,
        ctx.from.username
      );
      const userMessage = ctx.message.text.toLowerCase();
      const [word1, word2, word3] = userMessage.split(" ");

      if (word1 == "инвентарь") {
        await getInventory(user, ctx);
      }

      if (userMessage == "помощь") {
        ctx.reply(
          "инвентарь\nпокупка\nудалить\nслоты\nснять\nотдать\nнадеть\nмой пабло\nсписок"
        );
      }

      if (word1 == "покупка") {
        const id = Number(word2);
        const itemInfo = clothes[id];
        if (itemInfo && !isNaN(id)) {
          await buyItem(user, itemInfo, ctx, true);
        } else {
          ctx.reply("Такой вещи нет");
        }
      }

      if (userMessage == "очистка слотов") {
        ctx.reply("успешно");
        await user.update({ fullSlots: 0 });
      }

      if (word1 == "удалить") {
        const id = Number(word2);
        if (!isNaN(id)) {
          await deleteItem(user, id, ctx);
        }
      }

      if (word1 == "слоты") {
        ctx.reply(
          `Ваше количество слотов: ${user.slots}\nСлотов занято: ${user.fullSlots}\nБаланс: ${user.balance}\n`
        );
      }

      if (word1 == "снять") {
        const id = Number(word2);
        if (!isNaN(id)) {
          await removeItem(user, id, ctx);
        }
      }

      if (word1 == "отдать") {
        const id = Number(word2);
        if (!isNaN(id)) {
          await transferItem(user, id, ctx);
        }
      }

      if (word1 == "надеть") {
        const id = Number(word2);
        if (!isNaN(id)) {
          await wearItem(user, id, ctx);
        }
      }

      if (userMessage == "мой пабло") {
        await getWornItems(user, ctx);
      }

      if (userMessage == "удалить все") {
        await deleteAllItems(user, ctx);
      }

      if (word1 == "магазин") {
        const id = Number(word2);
        if (!isNaN(id)) {
          shopGenerator(id, ctx);
        }
      }

      if (userMessage == "список") {
        let result = "Список всех вещей\n";
        let i = 1;
        for (const item in clothes) {
          result += `${i}) ${clothes[item].name}[${item}] Цена: ${clothes[item].price}\n`;
          i++;
        }
        ctx.reply(
          result + '\n\nЧтобы купить товар напишите команду "Покупка {id вещи}"'
        );
      }

      if (word1 == "выдать") {
        const id = Number(word2);
        const itemInfo = clothes[id];
        if (itemInfo && !isNaN(id)) {
          await buyItem(user, itemInfo, ctx);
        } else {
          ctx.reply("Такой вещи нет");
        }
      }

      await user.save();
    } catch (error) {
      console.log(error);
    }
  });
  bot.launch();
};

start();
