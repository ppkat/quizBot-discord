const { MessageEmbed } = require("discord.js");
const { ParticipantDB, getNoRedeemedRewards } = require("../database");
const { SlashCommandBuilder } = require("@discordjs/builders");
const { updateRankedUsers } = require("./rank");
const quiz = require("../quiz.json");
const config = require("../config.json");
const client = require("../index");

let globalRegisteredUsers = [];
let activeChannels = [];

class Participant {
  constructor(name, id, score, tag, iconURL, channel) {
    this.name = name;
    this.id = id;
    this.score = score;
    this.tag = tag;
    this.iconURL = iconURL;
    this.channel = channel;
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("jogajunto_quiz")
    .setDescription("Inicia um game quiz")
    .addIntegerOption((option) =>
      option
        .setName("perguntas")
        .setDescription(
          "O número total de perguntas que o quiz terá. Se ocultado terá 20 perguntas"
        )
    )
    .addNumberOption((option) =>
      option
        .setName("resposta")
        .setDescription(
          "O tempo máximo para responder cada pergunta do quiz. Se ocultado será 30 segundos"
        )
    )
    .addNumberOption((option) =>
      option
        .setName("iniciar")
        .setDescription(
          "O tempo de espera para iniciar o quiz. Se ocultado será 40 segundos"
        )
    )
    .addStringOption((option) =>
      option
        .setName("dificuldade")
        .setDescription(
          "A dificuldade das perguntas. Caso oculto a dificuldade será crescente"
        )
        .addChoice("Fácil", "facil")
        .addChoice("Médio", "medio")
        .addChoice("Difícil", "dificil")
    ),

  execute: async ({ interaction: message }) => {
    if (activeChannels.find((channel) => message.channelId === channel))
      return message.reply("Já há um game rolando neste canal");
    else message.reply("Um quiz foi iniciado!!");
    activeChannels.push(message.channelId);

    const questionNumber = message.options.getInteger("perguntas") ?? 20;
    const timeForAnswers = message.options.getNumber("resposta")
      ? message.options.getNumber("resposta") * 1000
      : 30 * 1000;
    let timeForStart = message.options.getNumber("iniciar")
      ? message.options.getNumber("iniciar") * 1000
      : 40 * 1000;
    const difficultyType =
      message.options.getString("dificuldade") ?? "ascending";

    let localRegisteredUsers = [];

    const embedResponse = () => {
      const embedResponse = new MessageEmbed()
        .setColor("DARK_RED")
        .setTimestamp()
        .setAuthor({
          name: message.user.tag.toString(),
          iconURL: message.user.avatarURL(),
        })
        .setTitle(message.user.username + " Iniciou um game quiz")
        .setDescription("Reaja para votar em uma ou mais categorias")
        .setFooter({
          text: "Game Quiz",
          iconURL:
            "https://cdn.discordapp.com/avatars/958377729936457728/6582edbd65772f832a6fe7d3de39e627.png?size=1024",
        })
        .addFields(
          {
            name: "Numero de questões",
            value: String(questionNumber),
            inline: true,
          },
          {
            name: "Tempo das rodadas",
            value: String(timeForAnswers / 1000) + " segundos",
            inline: true,
          },
          {
            name: "Tempo para começar",
            value: String(timeForStart / 1000) + " segundos",
            inline: true,
          },
          {
            name: "Dificuldade",
            value: `${
              difficultyType === "ascending" ? "crescente" : difficultyType
            }`,
            inline: true,
          },
          {
            name: "Pessoas inscritas",
            value: localRegisteredUsers.length + " pessoas",
          }
        );

      return embedResponse;
    };

    const localMessagEmbedResponse = await message.channel
      .send({ embeds: [embedResponse()] })
      .then((msg) => msg);
    config.emojis.forEach((emoji) => localMessagEmbedResponse.react(emoji));

    async function updateRegisteredUsers({ reaction, user, channelId }) {
      if (user.bot) return;
      if (
        !globalRegisteredUsers.find((participant) => participant.id === user.id)
      ) {
        const inscribedParticipant = new Participant(
          user.username,
          user.id,
          0,
          user.toString(),
          user.avatarURL(),
          channelId
        );
        globalRegisteredUsers.push(inscribedParticipant);
        localRegisteredUsers.push(inscribedParticipant);

        localMessagEmbedResponse.embeds[0].fields[4].value = String(
          localRegisteredUsers.length
        );
        await localMessagEmbedResponse.edit({
          embeds: [localMessagEmbedResponse.embeds[0]],
        });
      } else if (
        globalRegisteredUsers.find(
          (participant) => participant.channel !== channelId
        )
      ) {
        user.send("Você só pode se inscrever em um quiz de cada vez");
        reaction.users.remove(user);
      }
    }

    async function getEmojInteraction() {
      const collector = localMessagEmbedResponse.createReactionCollector();

      collector.on("collect", (reaction, user) => {
        user
          .send("👌")
          .then(async () => {
            user.reply("teste");
          })
          .catch(async (err) =>
            user.reply(
              user.tag + " você precisa ter sua DM liberada para participar!"
            )
          );
      });

      collector.on("end", (collected) => {
        console.log(
          `após coletar ${collected.size} reações e a mensagem ser excluida, este evento é encerrado`
        );
      });
    }
    getEmojInteraction();

    async function quizStart() {
      if (localRegisteredUsers.length === 0) return await endQuiz();

      const [firstPoints, secondPoints, thirdPoints, forthPoints, restPoints] =
        [50, 30, 20, 10, 5];

      function choseCategory() {
        let reactionsCounts = localMessagEmbedResponse.reactions.cache.map(
          (reaction) => reaction.count
        );
        const categoryWinnerIndex = reactionsCounts.findIndex(
          (item) => item === Math.max(...reactionsCounts)
        );
        const categoryNames = localMessagEmbedResponse.reactions.cache.map(
          (reaction) => reaction.emoji.name
        );
        const categoryWinnerName = categoryNames[categoryWinnerIndex];

        if (
          categoryWinnerName === "aleatorio" ||
          categoryWinnerName === "random"
        ) {
          let questions = [];
          quiz.forEach((category) =>
            category.questions.forEach((question) => questions.push(question))
          );
          return questions;
        }

        const categoryWinnerJSONIndex = quiz.findIndex(
          (item) => item.categoryName === categoryWinnerName
        );
        const categoryWinnerJSON = quiz[categoryWinnerJSONIndex];

        return categoryWinnerJSON.questions;
      }
      const questions = choseCategory();

      let difficulty =
        difficultyType === "ascending" ? "facil" : difficultyType;
      let questionsNoSendeds = questions.filter(
        (question) => question.difficulty === difficulty
      );
      let index = 0;
      while (index < questionNumber) {
        index++;

        function choseQuestion() {
          if (difficultyType === "ascending" && index > questionNumber / 3) {
            if (difficulty === "facil") {
              questionsNoSendeds = [];
              difficulty = "medio";
            }

            if (difficulty === "medio" && index > (questionNumber * 2) / 3) {
              questionsNoSendeds = [];
              difficulty = "dificil";
            }
          }
          if (questionsNoSendeds.length === 0)
            questionsNoSendeds = questions.filter(
              (question) => question.difficulty === difficulty
            );
          if (questionsNoSendeds.length === 0)
            questionsNoSendeds = [...questions]; //if the category have not questions on this difficulty

          const randomIndex = Math.floor(
            Math.random() * questionsNoSendeds.length
          );
          let question = questionsNoSendeds[randomIndex];
          questionsNoSendeds.splice(randomIndex, 1);

          return question;
        }

        let question = choseQuestion();

        const questionEmbed = new MessageEmbed()
          .setTitle("❓❓" + question.question + "❓❓")
          .setColor("DARK_RED");

        await message.channel.send({ embeds: [questionEmbed] });

        let wrongAnswersCount = 0;
        let answerTimeLeft = timeForAnswers;
        let scoredParticipants = [];

        const decressAnswerTimeLeftId = setInterval(() => {
          answerTimeLeft -= 101;
          if (answerTimeLeft === 60 * 1000)
            localMessagEmbedResponse.channel.send(config.gifs["60seconds"]);
          else if (answerTimeLeft === 50 * 1000)
            localMessagEmbedResponse.channel.send(config.gifs["50seconds"]);
          else if (answerTimeLeft === 40 * 1000)
            localMessagEmbedResponse.channel.send(config.gifs["40seconds"]);
          else if (answerTimeLeft === 30 * 1000)
            localMessagEmbedResponse.channel.send(config.gifs["30seconds"]);
          else if (answerTimeLeft === 20 * 1000)
            localMessagEmbedResponse.channel.send(config.gifs["20seconds"]);
          else if (answerTimeLeft === 15 * 1000)
            localMessagEmbedResponse.channel.send(config.gifs["15seconds"]);
          else if (answerTimeLeft === 10 * 1000)
            localMessagEmbedResponse.channel.send(config.gifs["10seconds"]);
          else if (answerTimeLeft === 5 * 1000)
            localMessagEmbedResponse.channel.send(config.gifs["5seconds"]);
          else if (answerTimeLeft === 0)
            localMessagEmbedResponse.channel.send(config.gifs["ended"]);
        }, 100);

        async function usersAnswersHandle() {
          //round

          const filter = (m) => {
            if (
              !localRegisteredUsers.find(
                (participant) => participant.id === m.author.id
              )
            ) {
              if (
                globalRegisteredUsers.find(
                  (participant) => participant.id === m.author.id
                )
              ) {
                m.delete();
                m.author.send(
                  'Você já está participando de um quiz! Envie "sair" no chat do outro quiz para sair'
                );
              } else
                updateRegisteredUsers({
                  user: m.author,
                  channelId: m.channelId,
                });
            }
            return localRegisteredUsers.find(
              (participant) => participant.id === m.author.id
            );
          };
          await message.channel
            .awaitMessages({
              filter,
              max: 1,
              time: answerTimeLeft,
              errors: ["time"],
            })
            .then(async (msg) => {
              msg = msg.first();

              const formatedCorrectAnswers = question.answers.map((answer) =>
                answer.toString().toLowerCase().split(" ").join("")
              );
              const formatedUserAnswer = msg.content
                .toLowerCase()
                .split(" ")
                .join("");
              const almostCorrectAnswers = formatedCorrectAnswers.map(
                (answer) =>
                  answer.length > 3
                    ? answer.slice(1, answer.length - 1)
                    : answer
              );

              if (
                formatedUserAnswer === "sair" ||
                formatedUserAnswer === "leave"
              ) {
                localRegisteredUsers.splice(
                  localRegisteredUsers.findIndex(
                    (participant) => participant.id === msg.author.id
                  ),
                  1
                );
                globalRegisteredUsers.splice(
                  globalRegisteredUsers.findIndex(
                    (participant) => participant.id === msg.author.id
                  ),
                  1
                );
                msg.author.send("Você saiu do quiz");
                msg.react("☑️");
              } else if (
                formatedCorrectAnswers.some(
                  (answer) => answer === formatedUserAnswer
                )
              ) {
                msg.delete();

                const correctAnswerUser = localRegisteredUsers.find(
                  (participant) => participant.id === msg.author.id
                );
                if (
                  scoredParticipants.some(
                    (participant) => participant.id === correctAnswerUser.id
                  )
                ) {
                  msg.author.send({ content: "Sem trapacear" });
                } else {
                  scoredParticipants.push(correctAnswerUser);

                  const addScore =
                    scoredParticipants.length === 1
                      ? firstPoints
                      : scoredParticipants.length === 2
                      ? secondPoints
                      : scoredParticipants.length === 3
                      ? thirdPoints
                      : scoredParticipants.length === 4
                      ? forthPoints
                      : restPoints;

                  correctAnswerUser.score += addScore;
                  msg.channel.send(`${msg.author} ganhou ${addScore} pontos`);

                  if (scoredParticipants.length === localRegisteredUsers.length)
                    answerTimeLeft = 1000;
                }
              } else if (
                almostCorrectAnswers.some((answer) =>
                  formatedUserAnswer.includes(answer)
                )
              ) {
                msg.delete();
                msg.channel.send({ content: `${msg.author} está próximo!!🤫` });
                wrongAnswersCount++;
              } else {
                msg.react("❌");
                wrongAnswersCount++;
              }
              await usersAnswersHandle();
            })
            .catch((error) => {
              //console.log(error)
              if (scoredParticipants.length === 0) {
                localMessagEmbedResponse.channel
                  .send(
                    `Sem acertos nesta rodada! ${wrongAnswersCount} Respostas erradas`
                  )
                  .then((m) => m.react("😔"));
              } else if (
                scoredParticipants.length === localRegisteredUsers.length
              )
                localMessagEmbedResponse.channel.send(`**Todos acertaram!!**`);
              else {
                let scoredParticipantsNames = scoredParticipants.map(
                  (participant) => participant.name
                );
                let singularPlural =
                  scoredParticipantsNames.length === 1
                    ? "acertou!!"
                    : "acertaram!!";
                localMessagEmbedResponse.channel.send(
                  `✅ ${scoredParticipantsNames
                    .map((item) => `**${item}**`)
                    .join(", ")} ${singularPlural}`
                );
              }
              let singularPlural =
                question.answers.length > 1
                  ? "As respostas corretas eram"
                  : "A resposta correta era";
              localMessagEmbedResponse.channel.send(
                `${singularPlural} ${question.answers
                  .map((item) => `**${item}**`)
                  .join(", ")}`
              );
            });
        }

        await usersAnswersHandle();
        clearInterval(decressAnswerTimeLeftId);
      }

      function choseWinners() {
        let scores = localRegisteredUsers.map(
          (participant) => participant.score
        );
        let concurrents = [...localRegisteredUsers];

        const winnerIndex = scores.findIndex(
          (score) => score === Math.max(...scores)
        );
        const [winner] = concurrents.splice(winnerIndex, 1);
        scores.splice(winnerIndex, 1);
        const secondIndex = scores.findIndex(
          (score) => score === Math.max(...scores)
        );
        const [second] = concurrents.splice(secondIndex, 1);
        scores.splice(secondIndex, 1);
        const thirdIndex = scores.findIndex(
          (score) => score === Math.max(...scores)
        );
        const [third] = concurrents.splice(thirdIndex, 1);
        scores.splice(thirdIndex, 1);

        let descendingNoWinners = [];
        concurrents.forEach(() => {
          descendingNoWinners.push(
            concurrents.find(
              (concurrent) => concurrent.score === Math.max(...scores)
            )
          );
          scores.splice(
            scores.findIndex((score) => score === Math.max(...scores)),
            1
          );
        });

        return { winner, second, third, descendingNoWinners };
      }

      async function showResults() {
        const { winner, second, third, descendingNoWinners } = choseWinners();

        const embedResults = new MessageEmbed()
          .setColor("DARK_RED")
          .setTimestamp()
          .setTitle("Nenhum participante")
          .setFooter({
            text: "Game Quiz",
            iconURL:
              "https://cdn.discordapp.com/avatars/958377729936457728/6582edbd65772f832a6fe7d3de39e627.png?size=1024",
          });

        if (winner) {
          embedResults
            .setTitle(winner.name + " é o vencedor!! 🥳")
            .addField(
              "1º Lugar",
              `${winner.tag}, com **${winner.score}** pontos`
            )
            .setThumbnail(winner.iconURL);

          await sendWinnerRewards(winner);
        }

        if (second)
          embedResults.addField(
            "2º Lugar",
            `${second.tag}, com **${second.score}** pontos`
          );
        if (third)
          embedResults.addField(
            "3º Lugar",
            `${third.tag}, com **${third.score}** pontos`
          );

        if (descendingNoWinners.length !== 0) {
          noWinnersScores = descendingNoWinners.map(
            (nowinner) => `**${nowinner.score}**`
          );
          noWinnersTags = descendingNoWinners.map((nowinner) => nowinner.tag);
          noWinnersPlaces = descendingNoWinners.map(
            (nowinner, index) => `${index + 4}º`
          );

          noWinnersTextArray = [];
          for (i = 0; i < descendingNoWinners.length; i++) {
            noWinnersTextArray.push(
              `${noWinnersPlaces[i]}: ${noWinnersTags[i]}, com ${noWinnersScores[i]} pts`
            );
          }

          noWinnersText = noWinnersTextArray.join("\n");
          embedResults.addField("\u200b", noWinnersText);
        }

        async function sendWinnerRewards(winner) {
          const winnablePercentage = Math.floor(
            Math.random() * (100 - 0 + 1) + 0
          );
          const winnerUser = client.users.cache.find((u) => u.id === winner.id);

          if (winnablePercentage <= 30) {
            let rewards = await getNoRedeemedRewards();
            if (rewards.length > 0) {
              const randomReward =
                rewards[Math.floor(Math.random() * rewards.length)];
              randomReward.update({
                redeemed: true,
                winnerDiscordId: winner.id,
              });
              randomReward.save();

              await winnerUser.send(config.gifs["reward"]);

              await winnerUser.send(
                `Parabéns! Ao ganhar o game quiz da Player's Bank, você ganhou **${randomReward.name}**\n${randomReward.description}` +
                  "Logo a equipe entrará em contato para passar o seu prêmio!!"
              );
            } else {
              await winnerUser.send(
                "As recompensas desse evento já foram todas resgatadas, mas continue jogando para aumentar o seu Rank."
              );
            }
          } else {
            await winnerUser.send(
              "Parabéns! você acaba de subir no Rank, quanto mais você ganhar, mais chance de receber uma recompensa!"
            );
          }
        }

        await message.channel.send({ embeds: [embedResults] });
      }

      async function endQuiz() {
        await showResults();
        globalRegisteredUsers = globalRegisteredUsers.filter(
          (participant) => participant.channel !== message.channelId
        );
        activeChannels.splice(
          activeChannels.findIndex((channel) => channel === message.channelId),
          1
        );
        localMessagEmbedResponse.delete();

        async function storeOnDatabase() {
          localRegisteredUsers.forEach(async (participant) => {
            const [ParticipantDBInstance, isCreated] =
              await ParticipantDB.findOrCreate({
                where: { userId: participant.id },
                defaults: {
                  username: participant.name,
                  userId: participant.id,
                  score: participant.score,
                },
              });

            if (!isCreated) {
              ParticipantDBInstance.score += participant.score;
              ParticipantDBInstance.username = participant.name;
              ParticipantDBInstance.save();
            }
          });
        }
        storeOnDatabase();
        updateRankedUsers();
      }
      await endQuiz();
    }

    const waitQuizStartId = setInterval(() => {
      timeForStart -= 1 * 1000;
      localMessagEmbedResponse.embeds[0].fields[2].value =
        (timeForStart / 1000).toString() === 1
          ? (timeForStart / 1000).toString() + " segundo"
          : (timeForStart / 1000).toString() + " segundos";
      localMessagEmbedResponse.edit({
        embeds: [localMessagEmbedResponse.embeds[0]],
      });

      if (timeForStart <= 0) {
        clearInterval(waitQuizStartId);
        quizStart();
      }
    }, 1000);
  },
};
