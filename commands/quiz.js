const { MessageCollector } = require('discord.js')

module.exports = {

    name: 'quiz',
    execute: async ({ client, message, commandParams }) => {
        const questionNumber = commandParams.length === 0 ? 20 : Number(commandParams[0])
        const timeForAnswers = commandParams.length > 2 ? 60 * 1000 : Number(commandParams[1]) * 1000

        let questions = [ //it will be the API response
            { asking: 'Qual é o nome da irmã da Vi?', answer: 'Jinx' },
            { asking: 'Quantos campeões possuiam o lol em sua fase alpha?', answer: '17' },
            { asking: 'Quanto tempo a spike demora para explodir no valorant?', answer: '45 segundos' },
            { asking: 'Quanto tempo leva para desarmar a spike sem kit de desarme no CS:GO', answer: '10 segundos' }
        ]

        for (i = 0; i < questionNumber; i++) {
            const question = questions[Math.floor(Math.random() * questions.length)]
            await message.channel.send(question.asking)
            await message.channel.awaitMessages({ max: 1, time: timeForAnswers, errors: ['time'] })
                .then(message => {
                    console.log('mensagem recebida: ', message)
                    message = message.first()
                    if (message.content === question.answer) {
                        message.channel.send('acertou :)')
                    } else {
                        message.channel.send('errou :(')
                    }
                })
                .catch(collected => {
                    message.channel.send('Ninguéeeeeeeem acertou');
                });
            console.log('esperou a promisse')
        }

    }

}