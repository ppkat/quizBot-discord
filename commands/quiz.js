module.exports = {

    name: 'quiz',
    execute: async (client, message) => {

        let questions = [ //it will be the API response
            {question: 'Qual é o nome da irmã de Vi?', answer: 'Jinx'},
            {question: 'Quantos campeões possuiam o lol em sua fase alpha?', answer: '17'},
            {question: 'Quanto tempo a spike demora para explodir no valorant?', answer: '45 segundos'},
            {question: 'Quanto tempo leva para desarmar a spike sem kit de desarme no CS:GO', answer: '10 segundos'}
        ]

        await message.channel.send(questions)

    }

}