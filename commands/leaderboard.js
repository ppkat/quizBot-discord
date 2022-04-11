const { MessageEmbed } = require('discord.js')
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

module.exports = {
    name: 'leaderboard',
    ParticipantDB: Participant,
    execute: async ({ message }) => {

        const allUsers = await Participant.findAll()

        let scores = allUsers.map(user => user.score)
        console.log(scores)
        let top10 = []
        for (i = 0; i < 10 && i < allUsers.length; i++) {
            const biggerScoreIndex = scores.findIndex(score => score === Math.max(...scores))

            top10.push(allUsers.find(user => user.score === Math.max(...scores)))
            scores.splice(biggerScoreIndex, 1)
            allUsers.splice(biggerScoreIndex, 1)
        }

        const embedResponse = new MessageEmbed()
            .setColor('DARK_RED')
            .setTimestamp()
            .setAuthor({ name: message.author.tag.toString(), iconURL: message.author.avatarURL() })
            .setTitle('Leaderboard')
            .setDescription('Top 10 scores de todos os tempos')
            .setFooter({ text: 'Quiz leadboard', iconURL: 'https://cdn.discordapp.com/avatars/958377729936457728/6582edbd65772f832a6fe7d3de39e627.png?size=1024' })
            
        top10.forEach(user => {
            embedResponse.addField(`${user.username}`, `Totaliza **${user.score}** pontos`)
        })

        await message.channel.send({ embeds: [embedResponse] })
    }
}