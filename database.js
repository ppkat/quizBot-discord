const { Sequelize, DataTypes } = require("sequelize");
require("dotenv").config();

// const sequelize = new Sequelize(
//   process.env.DATABASE_NAME,
//   process.env.DATABASE_USER,
//   process.env.DATABASE_PASSWORD,
//   {
//     host: process.env.DATABASE_HOST,
//     dialect: "mysql",
//   }
// );

const sequelize = new Sequelize('pbdb', 'root', '0/6?Szgo)JFf*98@:e', { host: 'localhost', dialect: 'mysql' })

sequelize
  .authenticate()
  .then(() => console.log("Entrou no banco de dados"))
  .catch((err) => console.log(err));

const Participant = sequelize.define("Participants", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    allowNull: false,
    primaryKey: true,
  },

  username: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  userId: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  score: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
});

const Reward = sequelize.define("Rewards", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    allowNull: false,
    primaryKey: true,
  },

  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },

  redeemed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },

  rewardCode: {
    type: DataTypes.TEXT,
    allowNull: false,
  },

  winnerDiscordId: {
    type: DataTypes.TEXT,
  },
});

//sequelize.sync({ force: true }) //add the models on database generating tables

async function updateRank() {
  const allUsers = await Participant.findAll();
  console.log(allUsers)
  let usersNotRemoved = allUsers.map((users) => users.dataValues);

  let scores = usersNotRemoved.map((user) => user.score);
  let updatedRanks = [];
  for (i = 0; i < allUsers.length; i++) {
    const biggerScoreIndex = scores.findIndex(
      (score) => score === Math.max(...scores)
    );

    updatedRanks.push(
      usersNotRemoved.find((user) => user.score === Math.max(...scores))
    );
    scores.splice(biggerScoreIndex, 1);
    usersNotRemoved.splice(biggerScoreIndex, 1);
  }

  return updatedRanks;
}

async function getNoRedeemedRewards() {
  const noRedeemedRewards = await Reward.findAll({
    where: { redeemed: 0 },
  });

  return noRedeemedRewards;
}

module.exports = {
  ParticipantDB: Participant,
  updateRank,
  getNoRedeemedRewards,
};
