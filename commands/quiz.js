const { MessageCollector } = require('discord.js')

module.exports = {

    name: 'quiz',
    execute: async (client, message) => {

        console.log('chamou')
        let questions = [ //it will be the API response
            { asking: 'Qual é o nome da irmã da Vi?', answer: 'Jinx' },
            { asking: 'Quantos campeões possuiam o lol em sua fase alpha?', answer: '17' },
            { asking: 'Quanto tempo a spike demora para explodir no valorant?', answer: '45 segundos' },
            { asking: 'Quanto tempo leva para desarmar a spike sem kit de desarme no CS:GO', answer: '10 segundos' }
        ]

        //questions.forEach(async question => {
            question = questions[Math.floor(Math.random() * questions.length)]
            await message.channel.send(question.asking)
            //const collector = new MessageCollector(message.channel, m => m.author.id === message.author.id, { time: 10000 })
            //console.log(collector)
            let filter = m => m.author.id === message.author.id
            await message.channel.awaitMessages({filter, max: 1, time: 60000, errors: ['time'] })
                .then(message => {
                    console.log('durante a promisse')
                    message = message.first()
                    if (message.content === question.answer) {
                        message.channel.send('acertou :)')
                    } else {
                        message.channel.send('errou :(')
                    }
                })
                .catch(collected => {
                    message.channel.send('Timeout');
                });
            console.log('esperou a promisse')
        //})

    }

}