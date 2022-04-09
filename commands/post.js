const fs = require('fs')

const permitedUsersIds = ['233276507814887426' ,'845836299742216203']

module.exports = {
    name: 'post',
    execute: async ({ message, commandParams }) => {
        if (!permitedUsersIds.some(id => id === message.author.id)) return message.reply('Você não tem permissão para usar este comando')

        category = commandParams.splice(0, 1)[0]
        question = commandParams.splice(0, commandParams.findIndex(word => word.endsWith(')')) + 1).join(' ').slice(1, -1)
        answers = commandParams.splice(0, commandParams.findIndex(word => word.endsWith(')')) + 1).join(' ').slice(1, -1).split(',')
        difficulty = commandParams[0]

        if(!category || !question || !answers || !difficulty) return message.reply('Você precisa definir todos os parâmetros')
        if(difficulty === 'fácil') difficulty = 'facil'
        if(difficulty === 'médio') difficulty = 'medio'
        if(difficulty === 'difícil') difficulty = 'dificil'

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

        message.reply(`JSON alterado na categoria ${category} \n question: **${question}**, answers: **${answers}**, difficulty: **${difficulty}**`)
    }
}