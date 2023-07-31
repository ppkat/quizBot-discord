const { MessageEmbed } = require("discord.js");
const { ParticipantDB, getNoRedeemedRewards } = require("../database");
const { SlashCommandBuilder } = require("@discordjs/builders");
const { updateRankedUsers } = require("./rank");
const quiz = require("../quiz.json");
const config = require("../config.json");

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
    .setName("quiz")
    .setDescription("Inicia um game quiz")
    .addStringOption(option =>
      option
        .setName('modo')
        .setDescription('O modo de jogo. Se ocultado será modo tempo por padrão')
        .addChoice('Tempo', 'tempo')
        .addChoice('Primeiro', 'primeiro')
    )
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

  execute: async ({ interaction: message, client }) => {
    if (!config.permitedChannels.some(channel => message.channelId === channel)) return message.reply('Não é possível jogar nesta sala')
    if (activeChannels.find((channel) => message.channelId === channel)) return message.reply("Já há um game rolando neste canal");
    else message.reply("Um quiz foi iniciado!!");
    activeChannels.push(message.channelId);

    const gameMode = message.options.getString('modo') ?? 'tempo'
    const questionNumber = message.options.getInteger("perguntas") ?? 20;
    const timeForAnswers = message.options.getNumber("resposta") ? message.options.getNumber("resposta") * 1000 : 30 * 1000;
    let timeForStart = message.options.getNumber("iniciar") ? message.options.getNumber("iniciar") * 1000 : 40 * 1000;
    const difficultyType = message.options.getString("dificuldade") ?? "ascending";

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
            value: `${difficultyType === "ascending" ? "crescente" : difficultyType
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

    const localMessagEmbedResponse = await message.channel.send({ embeds: [embedResponse()] }).then((msg) => msg);
    config.emojis.forEach((emoji) => localMessagEmbedResponse.react(emoji));

    function waitUsersLeave() {
      const filter = m => m.content.toLowerCase() === 'sair'
      localMessagEmbedResponse.channel.awaitMessages({ filter, max: 1, time: timeForStart < 10 * 1000 ? 10 * 1000 /*10s more */ : timeForStart + 10 * 1000, errors: ['time'] })
        .then(msg => {
          msg = msg.first()
          const removedUser = localRegisteredUsers.splice(localRegisteredUsers.findIndex((participant) => participant.id === msg.author.id), 1)
          if (removedUser.length !== 0) {
            globalRegisteredUsers.splice(globalRegisteredUsers.findIndex((participant) => participant.id === msg.author.id), 1)
            msg.react("☑️")
          } else {
            msg.reply('Você não está inscrito')
          }
          waitUsersLeave()
        })
        .catch(err => {
          console.log(err)
        })
    }
    waitUsersLeave()

    async function updateRegisteredUsers({ reaction, user, channelId }) {
      if (user.bot) return;
      if (!globalRegisteredUsers.find((participant) => participant.id === user.id)) {
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

        localMessagEmbedResponse.embeds[0].fields[4].value = String(localRegisteredUsers.length) + ' pessoas'
        await localMessagEmbedResponse.edit({ embeds: [localMessagEmbedResponse.embeds[0]] });

        localMessagEmbedResponse.channel.send(user.toString() + " entrou no quiz!");
      } else if (globalRegisteredUsers.find((participant) => participant.channel !== channelId)) {
        user.send("Você só pode se inscrever em um quiz de cada vez");
        //decrescing API requests reaction.users.remove(user);
      }
    }

    async function getEmojInteraction() {
      const collector = localMessagEmbedResponse.createReactionCollector();
      collector.on("collect", (reaction, user) => {
        updateRegisteredUsers({
          reaction,
          user,
          channelId: reaction.message.channelId,
        });
      });
    }

    getEmojInteraction();

    async function quizStart() {
      if (localRegisteredUsers.length < 2) return await endQuiz(); // min x participants per quiz

      const [firstPoints, secondPoints, thirdPoints, forthPoints, restPoints] = [50, 30, 20, 10, 5];

      function choseCategory() {
        let reactionsCounts = localMessagEmbedResponse.reactions.cache.map((reaction) => reaction.count)
        const categoryWinnerIndex = reactionsCounts.findIndex((item) => item === Math.max(...reactionsCounts))
        const categoryNames = localMessagEmbedResponse.reactions.cache.map((reaction) => reaction.emoji.name)
        const categoryWinnerName = categoryNames[categoryWinnerIndex];

        if (categoryWinnerName === "aleatorio" || categoryWinnerName === "random") {
          let questions = []
          quiz.forEach((category) => category.questions.forEach((question) => questions.push(question)))
          return questions
        }

        const categoryWinnerJSONIndex = quiz.findIndex((item) => item.categoryName === categoryWinnerName)
        const categoryWinnerJSON = quiz[categoryWinnerJSONIndex];

        return categoryWinnerJSON.questions;
      }
      const questions = choseCategory();

      let difficulty = difficultyType === "ascending" ? "facil" : difficultyType;
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
          answerTimeLeft -= 100;
          if (answerTimeLeft === 60 * 1000) localMessagEmbedResponse.channel.send(config.gifs["60seconds"]);
          else if (answerTimeLeft === 50 * 1000) localMessagEmbedResponse.channel.send(config.gifs["50seconds"]);
          else if (answerTimeLeft === 40 * 1000) localMessagEmbedResponse.channel.send(config.gifs["40seconds"]);
          else if (answerTimeLeft === 30 * 1000) localMessagEmbedResponse.channel.send(config.gifs["30seconds"]);
          else if (answerTimeLeft === 20 * 1000) localMessagEmbedResponse.channel.send(config.gifs["20seconds"]);
          else if (answerTimeLeft === 15 * 1000) localMessagEmbedResponse.channel.send(config.gifs["15seconds"]);
          else if (answerTimeLeft === 10 * 1000) localMessagEmbedResponse.channel.send(config.gifs["10seconds"]);
          else if (answerTimeLeft === 5 * 1000) localMessagEmbedResponse.channel.send(config.gifs["5seconds"]);
          else if (answerTimeLeft === 0) localMessagEmbedResponse.channel.send(config.gifs["ended"]);
        }, 100);

        async function usersAnswersHandle() {
          //round

          const formatedCorrectAnswers = question.answers.map((answer) => answer.toString().toLowerCase().replace(' ', ''))
          const almostCorrectAnswers = formatedCorrectAnswers.map((answer) => answer.length > 3 ? answer.slice(1, answer.length - 1) : answer)
          const formatedUserAnswer = m => m.content.toLowerCase().replace(' ', '');

          const filter = (m) => {
            if (!localRegisteredUsers.find((participant) => participant.id === m.author.id)) {
              if (globalRegisteredUsers.find((participant) => participant.id === m.author.id)) {
                m.delete();
                m.author.send('Você já está participando de um quiz! Envie "sair" no chat do outro quiz para sair')
              } else updateRegisteredUsers({ user: m.author, channelId: m.channelId });
            }

            if (formatedCorrectAnswers.some((answer) => answer === formatedUserAnswer(m))) {
              if (gameMode === 'tempo') m.delete()
              else m.react('✅')
            }
            return localRegisteredUsers.find((participant) => participant.id === m.author.id)
          }
          await message.channel
            .awaitMessages({
              filter,
              max: 1,
              time: answerTimeLeft,
              errors: ["time"],
            })
            .then(async (msg) => {
              msg = msg.first();

              if (formatedUserAnswer(msg) === "sair" || formatedUserAnswer(msg) === "leave") {

                localRegisteredUsers.splice(localRegisteredUsers.findIndex((participant) => participant.id === msg.author.id), 1);
                globalRegisteredUsers.splice(globalRegisteredUsers.findIndex((participant) => participant.id === msg.author.id), 1);
                msg.react("☑️");
              } else if (formatedCorrectAnswers.some((answer) => answer === formatedUserAnswer(msg))) {

                const correctAnswerUser = localRegisteredUsers.find((participant) => participant.id === msg.author.id);
                if (scoredParticipants.some((participant) => participant.id === correctAnswerUser.id)) return msg.author.send({ content: "Sem trapacear" })

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

                if (scoredParticipants.length === localRegisteredUsers.length) return answerTimeLeft = 1000;

              } else {
                wrongAnswersCount++

                if (almostCorrectAnswers.some((answer) => formatedUserAnswer(msg).includes(answer))) {
                  msg.channel.send({ content: `${msg.author} está próximo!!🤫` });
                  msg.delete()
                } else msg.react("❌")

                return await usersAnswersHandle()
              }

              if (gameMode === 'tempo') await usersAnswersHandle()
            })
            .catch((error) => {
              //console.log(error)
              if (scoredParticipants.length === 0) {
                localMessagEmbedResponse.channel
                  .send(
                    `Sem acertos nesta rodada! ${wrongAnswersCount} Respostas erradas`
                  )
                  .then((m) => m.react("😔"));
              } else if (scoredParticipants.length === localRegisteredUsers.length) localMessagEmbedResponse.channel.send(`**Todos acertaram!!**`);
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
        let { winner, second, third, descendingNoWinners } = choseWinners();
        //if (localRegisteredUsers.length < 3) [winner, second, third, descendingNoWinners] = [null, null, null, []]

        const embedResults = new MessageEmbed()
          .setColor("DARK_RED")
          .setTimestamp()
          .setTitle("Menos de 2 participantes")
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

          await sendWinnerRewards();
        }

        if (second) embedResults.addField("2º Lugar", `${second.tag}, com **${second.score}** pontos`)
        if (third) embedResults.addField("3º Lugar", `${third.tag}, com **${third.score}** pontos`)

        if (descendingNoWinners.length !== 0) {
          noWinnersScores = descendingNoWinners.map((nowinner) => `**${nowinner.score}**`)
          noWinnersTags = descendingNoWinners.map((nowinner) => nowinner.name)
          noWinnersPlaces = descendingNoWinners.map((nowinner, index) => `${index + 4}º`)

          noWinnersTextArray = [];
          for (i = 0; i < descendingNoWinners.length; i++) noWinnersTextArray.push(`${noWinnersPlaces[i]}: ${noWinnersTags[i]}, com ${noWinnersScores[i]} pts`)

          noWinnersText = noWinnersTextArray.join("\n");
          embedResults.addField("\u200b", noWinnersText);
        }

        async function sendWinnerRewards() {
          const winnablePercentage = Math.floor(Math.random() * (100 - 0 + 1) + 0)
          const winnerUser = client.users.cache.find((u) => u.id === winner.id);

          if (!config["event?"]) return
          if (winnablePercentage <= 15) {
            let rewards = await getNoRedeemedRewards();
            if (rewards.length > 0) {
              const randomReward =
                rewards[Math.floor(Math.random() * rewards.length)];
              randomReward.update({
                redeemed: true,
                winnerDiscordId: winner.id,
              });
              randomReward.save();

              try {
                await winnerUser.send(config.gifs["reward"]);

                await winnerUser.send(
                  `Parabéns! Ao ganhar o game quiz da Player's Bank, você ganhou **${randomReward.name}**\n${randomReward.description}` +
                  "No prazo de 48 horas equipe entrará em contato para passar o seu prêmio!" +
                  `\n\n${randomReward.rewardCode}`
                );
              } catch (error) {
                console.log(error);
              }
            } else {
              await winnerUser.send("As recompensas desse evento já foram todas resgatadas, mas continue jogando para aumentar o seu Rank.")
            }
          } else {
            try {
              await winnerUser.send(
                "Parabéns! você acaba de subir no Rank, quanto mais você ganhar, mais chance de receber uma recompensa!"
              );
            } catch (error) {
              console.log(error);
            }
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

      if (timeForStart <= 0) {
        if (localMessagEmbedResponse.reactions.cache.size === config.emojis.length) {
          setTimeout(() => quizStart(), 1000) //the user has to be time for react in the last reaction
          clearInterval(waitQuizStartId);
        } else {
          localMessagEmbedResponse.embeds[0].fields[2].value = 'O jogo começará logo após todas a reações aparecerem'
          localMessagEmbedResponse.edit({ embeds: [localMessagEmbedResponse.embeds[0]] })
        }
      } else {
        timeForStart -= 1 * 1000;
        localMessagEmbedResponse.embeds[0].fields[2].value =
          (timeForStart / 1000).toString() === 1
            ? (timeForStart / 1000).toString() + " segundo"
            : (timeForStart / 1000).toString() + " segundos";
        localMessagEmbedResponse.edit({ embeds: [localMessagEmbedResponse.embeds[0]] })
      }
    }, 1000);
  },
};
