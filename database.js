const { Sequelize, DataTypes } = require('sequelize')
require('dotenv').config()

const databaseName = 'pbdb'
const sequelize = new Sequelize(databaseName, 'root', process.env.MYSQL_PASSWORD, {
    host: "localhost",
    dialect: "mysql"
})

sequelize.authenticate().then(() => console.log('Entrou no banco de dados')).catch(err => console.log(err))

const Participant = sequelize.define('Participants', {

    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true
    },

    username: {
        type: DataTypes.STRING,
        allowNull: true
    },

    userId: {
        type: DataTypes.STRING,
        allowNull: false
    },

    score: {
        type: DataTypes.INTEGER,
        allowNull: false
    }

})

// sequelize.sync({force: true})

async function updateRank() {

    const allUsers = await Participant.findAll()

    let scores = allUsers.map(user => user.score)
    let updatedRanks = []
    for (i = 0; i < allUsers.length; i++) {
        const biggerScoreIndex = scores.findIndex(score => score === Math.max(...scores))

        updatedRanks.push(allUsers.find(user => user.score === Math.max(...scores)))
        scores.splice(biggerScoreIndex, 1)
        allUsers.splice(biggerScoreIndex, 1)
    }

    return updatedRanks
}

module.exports = {
    ParticipantDB: Participant,
    updateRank
}
