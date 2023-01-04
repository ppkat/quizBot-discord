const { SlashCommandBuilder } = require('@discordjs/builders')
const fs = require('fs')
const config = require('../config.json')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('post')
        .setDescription('adiciona perguntas ao quiz')
        .addStringOption(option =>
            option.setName('categoria')
                .setDescription('A categoria que a pergunta deve ser adicionada. Ignorará espaços')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('pergunta')
                .setDescription('A pergunta a ser feita')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('respostas')
                .setDescription('As respostas para a pergunta separadas por vírgula')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('dificuldade')
                .setDescription('A dificuldade da pergunta em questão')
                .setRequired(true)
                .addChoice('Fácil', 'facil')
                .addChoice('Médio', 'medio')
                .addChoice('Difícil', 'dificil')),

    execute: async ({ interaction: message }) => {
        //if (!config['permitedUsersIdsToUse!post'].some(id => id === message.user.id)) return message.reply('Você não tem permissão para usar este comando')

        category = message.options.getString('categoria').split(' ').join('')
        question = message.options.getString('pergunta')
        answers = message.options.getString('respostas').split(',')
        difficulty = message.options.getString('dificuldade')

        const filePath = './quiz.json'
        const stringData = fs.readFileSync(filePath, 'utf-8')
        const objectData = JSON.parse(stringData)

        function updateObjectData() {
            const categoryIndex = objectData.findIndex(cat => cat.categoryName.toLowerCase() === category.toLowerCase())
            const JSONcategory = categoryIndex === -1 ? objectData[objectData.push({ categoryName: category, questions: [] }) - 1] : objectData[categoryIndex]
            JSONcategory.questions.push({ question, answers, difficulty })
        }
        updateObjectData()

        function writeJSON() {
            const newStringData = JSON.stringify(objectData, null, 4)
            fs.writeFileSync(filePath, newStringData, 'utf-8')
        }
        writeJSON()

        message.reply(`JSON alterado na categoria **${category}** \nquestion: **${question}**, answers: **${answers}**, difficulty: **${difficulty}**`)
    }
}