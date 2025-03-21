const express = require("express");
const fs = require("fs");
const { exec } = require("child_process");
let router = express.Router();
const pino = require("pino");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  delay,
  makeCacheableSignalKeyStore,
  Browsers,
  jidNormalizedUser,
} = require("@whiskeysockets/baileys");
const { upload } = require("./mega");

function removeFile(FilePath) {
  if (!fs.existsSync(FilePath)) return false;
  fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get("/", async (req, res) => {
  let num = req.query.number;
  async function LxnBotPair() {
    const { state, saveCreds } = await useMultiFileAuthState(`./session`);
    try {
      let LxnBot = makeWASocket({
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(
            state.keys,
            pino({ level: "fatal" }).child({ level: "fatal" })
          ),
        },
        printQRInTerminal: false,
        logger: pino({ level: "fatal" }).child({ level: "fatal" }),
        browser: Browsers.macOS("Safari"),
      });

      if (!LxnBot.authState.creds.registered) {
        await delay(1500);
        num = num.replace(/[^0-9]/g, "");
        const code = await LxnBot.requestPairingCode(num);
        if (!res.headersSent) {
          await res.send({ code });
        }
      }

      LxnBot.ev.on("creds.update", saveCreds);
      LxnBot.ev.on("connection.update", async (s) => {
        const { connection, lastDisconnect } = s;
        if (connection === "open") {
          try {
            await delay(10000);
            const auth_path = "./session/";
            const user_jid = jidNormalizedUser(LxnBot.user.id);

            function randomLxnId(length = 6, numberLength = 4) {
              const characters =
                "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
              let result = "";
              for (let i = 0; i < length; i++) {
                result += characters.charAt(
                  Math.floor(Math.random() * characters.length)
                );
              }
              const number = Math.floor(
                Math.random() * Math.pow(10, numberLength)
              );
              return `${result}${number}`;
            }

            const mega_url = await upload(
              fs.createReadStream(auth_path + "creds.json"),
              `${randomLxnId()}.json`
            );

            const string_session = mega_url.replace(
              "https://mega.nz/file/",
              ""
            );

            const sid = `*LXNBot [The powerful WA BOT]*\n\n👉 ${string_session} 👈\n\n*This is your Session ID, copy this ID and paste it into config.js file*\n\n*You can ask any question using this link*\n\n*wa.me/message/WKGLBR2PCETWD1*\n\n*You can join my WhatsApp group*\n\n*https://chat.whatsapp.com/GAOhr0qNK7KEvJwbenGivZ*`;
            const mg = `🛑 *Do not share this code with anyone* 🛑`;
            await LxnBot.sendMessage(user_jid, {
              image: {
                url: "https://raw.githubusercontent.com/Dark-Robin/Bot-Helper/refs/heads/main/autoimage/Bot%20robin%20WP.jpg",
              },
              caption: sid,
            });
            await LxnBot.sendMessage(user_jid, { text: string_session });
            await LxnBot.sendMessage(user_jid, { text: mg });
          } catch (e) {
            exec("pm2 restart lxnbot");
          }

          await delay(100);
          return await removeFile("./session");
          process.exit(0);
        } else if (
          connection === "close" &&
          lastDisconnect &&
          lastDisconnect.error &&
          lastDisconnect.error.output.statusCode !== 401
        ) {
          await delay(10000);
          LxnBotPair();
        }
      });
    } catch (err) {
      exec("pm2 restart LxnBot-md");
      console.log("Service restarted");
      LxnBotPair();
      await removeFile("./session");
      if (!res.headersSent) {
        await res.send({ code: "Service Unavailable" });
      }
    }
  }
  return await LxnBotPair();
});

process.on("uncaughtException", function (err) {
  console.log("Caught exception: " + err);
  exec("pm2 restart LxnBot");
});

module.exports = router;
