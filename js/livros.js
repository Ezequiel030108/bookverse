/* ============================================================
   ARQUIVO DOS LIVROS — É AQUI QUE VOCÊ MEXE NO DIA A DIA
   ============================================================

   Este arquivo guarda a lista de todos os livros que aparecem
   no site. Cada livro é um "bloco" entre chaves { ... } separado
   por uma vírgula no final.

   --------------------------------------------------------------
   COMO ADICIONAR UM LIVRO NOVO:
   --------------------------------------------------------------
   1. Copie um bloco inteiro de livro (das chaves { até a },)
   2. Cole logo abaixo, antes do ] que fecha a lista
   3. Troque as informações (título, autor, preço, etc.)
   4. Salve o arquivo e atualize a página no navegador (F5)

   --------------------------------------------------------------
   SIGNIFICADO DE CADA CAMPO:
   --------------------------------------------------------------
   titulo  -> Nome do livro (ex: "O Alquimista")
   autor   -> Nome do autor (ex: "Paulo Coelho")
   genero  -> Categoria onde o livro aparece no site. Use um destes:
              "Finanças & Negócios"
              "Autoajuda & Desenvolvimento Pessoal"
              "Ciência & Curiosidades"
              "Filosofia"
              "Clássicos da Literatura"
              "Romance & Literatura"
              "Suspense & Terror"
              "Mangás"
              (Pode criar um gênero novo: basta escrever aqui e,
               se quiser controlar a ordem, adicioná-lo também na
               lista ORDEM_GENEROS dentro do arquivo js/main.js)
   preco   -> Preço com R$ (ex: "R$ 32,00")
   estoque -> Quantidade que você tem em casa
              0 = esgotado (some do site)
              1 = "Último!" (selo âmbar)
              2 ou mais = "Disponível" (selo azul)
   estado  -> Condição do livro. Aparece em DESTAQUE no card.
              Ex: "Bom estado, porém grifado", "Ótimo estado",
              "Seminovo", "Novo"
   sinopse -> Um resumo curto do livro
   imagem  -> Caminho da capa dentro da pasta /img/
              Ex: "img/oliver-twist.jpg"
              Se não tiver capa, deixe assim: ""
   destaque -> (opcional) true para o livro aparecer entre os PRIMEIROS
              da sua categoria (os principais e mais famosos). Sem isso,
              ele segue a ordem normal do arquivo.
   descontoMaximo -> (opcional) limita o desconto da promoção neste livro
              (ex.: descontoMaximo: 10 -> nunca passa de 10% off).
   dataAdicao -> (opcional) A data em que você adicionou o livro, no
              formato "ANO-MÊS-DIA" (ex: "2026-06-19"). O site calcula
              sozinho e mostra os livros adicionados nos ÚLTIMOS 7 DIAS
              na seção "Novidades da Semana", no topo. Passada a semana,
              o livro sai de lá sozinho (mas continua na sua categoria).
              👉 Dica: ao cadastrar um livro novo, é só pôr a data de hoje.
              Se a semana ficar com poucos livros, o site completa com os
              mais recentes; se não houver nenhum, o título vira
              "Livros Novos".

   ============================================================ */


/* ============================================================
   PROMOÇÃO (liga e desliga sozinha pelas datas abaixo)
   ------------------------------------------------------------
   Enquanto a data de hoje estiver entre "inicio" e "fim", o site
   entra no modo promoção: preços com desconto, faixa no topo e
   decoração temática da Copa do Mundo. Fora desse período tudo
   volta ao normal sozinho. Para testar antes da data, abra o site
   com ?promo=teste no fim do endereço.
   ============================================================ */
const PROMOCAO = {
  nome: "Copa do Mundo",
  inicio: "2026-06-11",  // começo do torneio
  fim: "2026-06-29",     // último dia da promoção
  descontoUm: 10,        // % off em qualquer livro
  descontoDupla: 20      // % off em cada um, levando 2 ou mais
};

const LIVROS = [

  /* ===================== FINANÇAS & NEGÓCIOS ===================== */

  {
    titulo: "Do Mil ao Milhão: Sem Cortar o Cafezinho",
    destaque: true,
    autor: "Thiago Nigro",
    genero: "Finanças & Negócios",
    preco: "R$ 20,00",
    estoque: 1,
    estado: "Com marcas de uso",
    sinopse: "Thiago Nigro, o Primo Rico, compartilha sua jornada para a liberdade financeira e ensina como qualquer pessoa pode sair do zero e construir patrimônio real. Com linguagem direta e sem enrolação, o livro mostra como gastar bem, investir com inteligência e ganhar mais — sem precisar cortar o cafezinho.",
    imagem: "img/do-mil-ao-milhao.jpg",
    dataAdicao: "2026-06-18"
  },

  {
    titulo: "Quem Pensa Enriquece",
    destaque: true,
    autor: "Napoleon Hill",
    genero: "Finanças & Negócios",
    preco: "R$ 20,00",
    estoque: 1,
    estado: "Bom estado, porém grifado",
    sinopse: "Baseado no estudo de centenas de pessoas bem-sucedidas, Napoleon Hill revela os 13 princípios que conduzem à riqueza e à realização pessoal. Um dos maiores clássicos do desenvolvimento financeiro de todos os tempos.",
    imagem: "img/quem-pensa-enriquece.jpg"
  },

  {
    titulo: "O Homem Mais Rico da Babilônia",
    destaque: true,
    autor: "George S. Clason",
    genero: "Finanças & Negócios",
    preco: "R$ 16,00",
    estoque: 1,
    estado: "Bom estado, porém muito grifado",
    sinopse: "Através de parábolas ambientadas na antiga Babilônia, o autor ensina princípios atemporais sobre como economizar, investir e construir riqueza de forma simples e duradoura.",
    imagem: "img/o-homem-mais-rico-da-babilonia.jpg"
  },

  {
    titulo: "Os Segredos da Mente Milionária",
    autor: "T. Harv Eker",
    genero: "Finanças & Negócios",
    preco: "R$ 30,00",
    estoque: 3,
    estado: "Ótimo estado",
    sinopse: "T. Harv Eker mostra como o 'modelo de dinheiro' que carregamos desde a infância determina nossa vida financeira — e ensina a reprogramar a mente para a prosperidade e a riqueza.",
    imagem: "img/os-segredos-da-mente-milionaria.jpg"
  },

  {
    titulo: "Marketing 4.0",
    autor: "Philip Kotler",
    genero: "Finanças & Negócios",
    preco: "R$ 36,00",
    estoque: 1,
    estado: "Ótimo estado, porém grifado",
    sinopse: "Philip Kotler, o pai do marketing moderno, apresenta a transição do marketing tradicional para o digital, mostrando como conquistar clientes na era da conectividade integrando o online e o offline.",
    imagem: "img/marketing-4-0.jpg"
  },

  {
    titulo: "A Estrada do Futuro",
    autor: "Bill Gates",
    genero: "Finanças & Negócios",
    preco: "R$ 30,00",
    estoque: 1,
    estado: "Quase novo",
    sinopse: "Escrito pelo fundador da Microsoft, este clássico apresenta a visão de Bill Gates sobre a revolução digital e o impacto da internet e dos computadores no futuro do trabalho, da educação e do nosso dia a dia.",
    imagem: "img/a-estrada-do-futuro.jpg",
    dataAdicao: "2026-06-09"
  },

  /* ============= AUTOAJUDA & DESENVOLVIMENTO PESSOAL ============= */

  {
    titulo: "O Poder do Subconsciente",
    destaque: true,
    autor: "Dr. Joseph Murphy",
    genero: "Autoajuda & Desenvolvimento Pessoal",
    preco: "R$ 25,00",
    estoque: 1,
    estado: "Bom estado, porém grifado",
    sinopse: "Joseph Murphy revela como a mente subconsciente pode ser programada para transformar pensamentos em realidade, alcançando saúde, prosperidade e felicidade através de técnicas práticas.",
    imagem: "img/o-poder-do-subconsciente.jpg"
  },

  {
    titulo: "Como Fazer Amigos e Influenciar Pessoas",
    destaque: true,
    autor: "Dale Carnegie",
    genero: "Autoajuda & Desenvolvimento Pessoal",
    preco: "R$ 25,00",
    estoque: 1,
    estado: "Bom estado, porém grifado",
    sinopse: "O clássico definitivo sobre relações humanas. Dale Carnegie ensina princípios práticos para se comunicar melhor, conquistar a confiança das pessoas e influenciar positivamente quem está ao seu redor.",
    imagem: "img/como-fazer-amigos.jpg"
  },

  {
    titulo: "Como Evitar Preocupações e Começar a Viver",
    destaque: true,
    autor: "Dale Carnegie",
    genero: "Autoajuda & Desenvolvimento Pessoal",
    preco: "R$ 30,00",
    estoque: 1,
    estado: "Ótimo estado",
    sinopse: "Dale Carnegie apresenta técnicas práticas e comprovadas para vencer a ansiedade, o estresse e os medos do dia a dia. Com histórias reais e lições atemporais, o livro ensina como mudar a mentalidade, focar no presente e construir uma vida mais tranquila e produtiva. Um clássico com mais de 50 milhões de cópias vendidas.",
    imagem: "img/como-evitar-preocupacoes.jpg",
    dataAdicao: "2026-06-18"
  },

  {
    titulo: "Quer? Levanta e Pega!",
    autor: "Júnior Q9",
    genero: "Autoajuda & Desenvolvimento Pessoal",
    preco: "R$ 30,00",
    estoque: 1,
    estado: "Bom estado",
    sinopse: "Uma mensagem motivacional direta sobre atitude, foco e ação. Um chamado para sair da zona de conforto e correr atrás dos seus objetivos e sonhos.",
    imagem: "img/quer-levanta-e-pega.jpg"
  },

  /* ===================== CIÊNCIA & CURIOSIDADES ===================== */

  {
    titulo: "A História do Universo Para Quem Tem Pressa",
    autor: "Colin Stuart",
    genero: "Ciência & Curiosidades",
    preco: "R$ 40,00",
    estoque: 1,
    estado: "Bom estado",
    sinopse: "Um guia rápido e acessível que percorre as mais recentes descobertas da astronomia, do Big Bang aos confins do cosmos. Perfeito para quem quer entender o universo sem complicação.",
    imagem: "img/a-historia-do-universo.jpg"
  },

  /* ===================== CLÁSSICOS DA LITERATURA ===================== */

  {
    titulo: "Oliver Twist",
    autor: "Charles Dickens",
    genero: "Clássicos da Literatura",
    preco: "R$ 30,00",
    estoque: 1,
    estado: "Seminovo",
    sinopse: "Um órfão enfrenta a miséria e a exploração na Londres do século XIX, passando por orfanatos, gangues de batedores de carteira e muitas reviravoltas, em um dos romances mais célebres de Charles Dickens.",
    imagem: "img/oliver-twist.jpg"
  },

  {
    titulo: "A Volta ao Mundo em 80 Dias",
    autor: "Júlio Verne",
    genero: "Clássicos da Literatura",
    preco: "R$ 40,00",
    estoque: 1,
    estado: "Estado perfeito",
    sinopse: "O excêntrico inglês Phileas Fogg aposta que consegue dar a volta ao mundo em apenas 80 dias. Ao lado de seu criado Passepartout, embarca em uma aventura cheia de imprevistos pelos quatro cantos do planeta.",
    imagem: "img/a-volta-ao-mundo-em-80-dias.jpg"
  },

  {
    titulo: "O Morro dos Ventos Uivantes",
    destaque: true,
    autor: "Emily Brontë",
    genero: "Clássicos da Literatura",
    preco: "R$ 38,00",
    estoque: 1,
    estado: "Novo, lacrado",
    sinopse: "Nas charnecas sombrias da Inglaterra, o amor intenso e destrutivo entre Catherine e Heathcliff atravessa gerações, misturando paixão, vingança e obsessão. O único romance de Emily Brontë é um dos maiores clássicos de todos os tempos.",
    imagem: "img/o-morro-dos-ventos-uivantes.jpg"
  },

  {
    titulo: "Fahrenheit 451",
    destaque: true,
    autor: "Ray Bradbury",
    genero: "Clássicos da Literatura",
    preco: "R$ 35,00",
    estoque: 1,
    estado: "Com marcas de uso",
    sinopse: "Em uma sociedade onde os livros são proibidos e queimados por bombeiros, o bombeiro Guy Montag começa a questionar seu papel. Um clássico distópico sobre censura, conhecimento e liberdade de pensamento.",
    imagem: "img/fahrenheit-451.jpg"
  },

  {
    titulo: "1984",
    destaque: true,
    autor: "George Orwell",
    genero: "Clássicos da Literatura",
    preco: "R$ 30,00",
    estoque: 1,
    estado: "Quase novo",
    sinopse: "Em uma sociedade dominada por um Estado totalitário e vigiada pelo onipresente Grande Irmão, Winston Smith tenta resistir ao controle absoluto do pensamento. Uma das distopias mais influentes de todos os tempos, sobre liberdade, verdade e manipulação.",
    imagem: "img/1984.jpg"
  },

  {
    titulo: "A Revolução dos Bichos",
    destaque: true,
    autor: "George Orwell",
    genero: "Clássicos da Literatura",
    preco: "R$ 30,00",
    estoque: 1,
    estado: "Quase novo",
    sinopse: "Cansados da exploração humana, os animais de uma fazenda se rebelam e tomam o poder em nome da igualdade. Mas o sonho logo se corrompe, nesta fábula afiada de George Orwell sobre poder, revolução e os perigos do totalitarismo.",
    imagem: "img/a-revolucao-dos-bichos.jpg",
    dataAdicao: "2026-06-08"
  },

  {
    titulo: "Dentro da Baleia e Outros Ensaios",
    autor: "George Orwell",
    genero: "Clássicos da Literatura",
    preco: "R$ 25,00",
    estoque: 1,
    estado: "Quase novo",
    sinopse: "Uma reunião de ensaios de George Orwell que revela seu olhar agudo sobre literatura, política e a sociedade de seu tempo. Textos lúcidos e provocadores que mostram por que Orwell é um dos maiores pensadores do século XX.",
    imagem: "img/dentro-da-baleia-e-outros-ensaios.jpg",
    dataAdicao: "2026-06-08"
  },

  {
    titulo: "As Aventuras de Sherlock Holmes – Vol. 1",
    autor: "Arthur Conan Doyle",
    genero: "Clássicos da Literatura",
    preco: "R$ 30,00",
    estoque: 1,
    estado: "Quase novo",
    sinopse: "O primeiro volume das aventuras do mais famoso detetive de todos os tempos. Ao lado do fiel Dr. Watson, Sherlock Holmes usa sua genialidade dedutiva para desvendar mistérios intrigantes nas ruas da Londres vitoriana.",
    imagem: "img/sherlock-holmes-vol-1.jpg",
    dataAdicao: "2026-06-07"
  },

  {
    titulo: "As Aventuras de Sherlock Holmes – Vol. 2",
    autor: "Arthur Conan Doyle",
    genero: "Clássicos da Literatura",
    preco: "R$ 30,00",
    estoque: 1,
    estado: "Quase novo",
    sinopse: "A continuação das clássicas aventuras de Sherlock Holmes e Dr. Watson. Novos casos, enigmas e crimes desafiam a mente brilhante do detetive de Baker Street, em histórias imortais de Sir Arthur Conan Doyle.",
    imagem: "img/sherlock-holmes-vol-2.jpg",
    dataAdicao: "2026-06-07"
  },

  {
    titulo: "As Aventuras de Sherlock Holmes – Vol. 3",
    autor: "Arthur Conan Doyle",
    genero: "Clássicos da Literatura",
    preco: "R$ 30,00",
    estoque: 1,
    estado: "Quase novo",
    sinopse: "O terceiro volume das aventuras de Sherlock Holmes reúne mais casos memoráveis do detetive mais célebre da literatura. Dedução, suspense e a inconfundível parceria com o Dr. Watson em narrativas que atravessam gerações.",
    imagem: "img/sherlock-holmes-vol-3.jpg",
    dataAdicao: "2026-06-07"
  },

  {
    titulo: "O Curioso Caso de Benjamin Button",
    autor: "F. Scott Fitzgerald",
    genero: "Clássicos da Literatura",
    preco: "R$ 25,00",
    estoque: 1,
    estado: "Estado perfeito",
    sinopse: "Benjamin Button nasce como um velho de setenta anos e, ao longo da vida, rejuvenesce em vez de envelhecer. Um conto genial e melancólico de F. Scott Fitzgerald sobre o tempo, a sociedade e o sentido da existência, que inspirou o célebre filme.",
    imagem: "img/o-curioso-caso-de-benjamin-button.jpg",
    dataAdicao: "2026-06-27"
  },

  /* ===================== ROMANCE & LITERATURA ===================== */

  {
    titulo: "O Guardião do Tempo",
    autor: "Mitch Albom",
    genero: "Romance & Literatura",
    preco: "R$ 20,00",
    estoque: 1,
    estado: "Bom estado",
    sinopse: "Pai Tempo, o homem que inventou a medição das horas, é condenado a viver isolado por milênios. Para se redimir, precisa ensinar o verdadeiro significado do tempo a duas pessoas na Terra.",
    imagem: "img/o-guardiao-do-tempo.jpg"
  },

  {
    titulo: "O Xangô de Baker Street",
    autor: "Jô Soares",
    genero: "Romance & Literatura",
    preco: "R$ 30,00",
    estoque: 1,
    estado: "Bom estado",
    sinopse: "No Rio de Janeiro do final do século XIX, Sherlock Holmes é convocado para resolver um misterioso caso de assassinatos. Jô Soares mistura humor, história e suspense neste best-seller.",
    imagem: "img/o-xango-de-baker-street.jpg"
  },

  {
    titulo: "Memórias Quase Póstumas de Machado de Assis",
    autor: "Álvaro Cardoso Gomes",
    genero: "Romance & Literatura",
    preco: "R$ 40,00",
    estoque: 1,
    estado: "Estado perfeito",
    sinopse: "Uma recriação literária inspirada no universo de Machado de Assis e seu célebre Brás Cubas, revisitando com bom humor a obra do maior escritor brasileiro.",
    imagem: "img/memorias-quase-postumas-machado.jpg"
  },

  {
    titulo: "Paredes da Memória",
    autor: "Tiago Marinho",
    genero: "Romance & Literatura",
    preco: "R$ 40,00",
    estoque: 1,
    estado: "Ótimo estado",
    sinopse: "Um romance sensível sobre memória, afeto e as histórias guardadas ao longo do tempo, explorando como as lembranças moldam quem somos.",
    imagem: "img/paredes-da-memoria.jpg"
  },

  /* ========================= FILOSOFIA ========================= */

  {
    titulo: "A Política",
    destaque: true,
    autor: "Aristóteles",
    genero: "Filosofia",
    preco: "R$ 25,00",
    estoque: 1,
    estado: "Ótimo estado",
    sinopse: "Um dos textos mais influentes da história do pensamento humano, escrito pelo filósofo grego Aristóteles. Nesta obra, Aristóteles investiga a natureza do Estado, as formas de governo, a cidadania e a justiça, lançando as bases da ciência política ocidental. Leitura indispensável para entender como as sociedades se organizam e por quê.",
    imagem: "img/aristoteles-a-politica.jpg",
    dataAdicao: "2026-06-17"
  },

  {
    titulo: "O Anticristo",
    autor: "Friedrich Nietzsche",
    genero: "Filosofia",
    preco: "R$ 20,00",
    estoque: 1,
    estado: "Bom estado, porém grifado",
    sinopse: "Em um de seus textos mais polêmicos, Nietzsche faz uma crítica radical ao cristianismo e aos valores morais que ele considerava contrários à vida e ao florescimento humano. Com uma escrita incisiva e provocadora, o filósofo propõe uma reavaliação dos fundamentos da civilização ocidental. Obra essencial para compreender o pensamento nietzschiano em sua forma mais ousada.",
    imagem: "img/nietzsche-o-anticristo.jpg",
    dataAdicao: "2026-06-17"
  },

  {
    titulo: "O Príncipe",
    destaque: true,
    autor: "Nicolau Maquiavel",
    genero: "Filosofia",
    preco: "R$ 14,00",
    estoque: 1,
    estado: "Estado perfeito",
    sinopse: "O mais célebre tratado político de todos os tempos. Com frieza e realismo, Maquiavel analisa como o poder é conquistado e mantido, separando a política da moral e inaugurando o pensamento político moderno. Leitura indispensável para compreender as relações de poder.",
    imagem: "img/o-principe.jpg",
    dataAdicao: "2026-06-27"
  },

  /* =================== ROMANCE & LITERATURA =================== */

  {
    titulo: "A Batalha do Apocalipse",
    destaque: true,
    autor: "Eduardo Spohr",
    genero: "Romance & Literatura",
    preco: "R$ 25,00",
    estoque: 1,
    estado: "Com marcas de uso",
    sinopse: "Da queda dos anjos ao crepúsculo do mundo: o anjo guerreiro Ablon atravessa milênios em uma epopeia sobre amor, traição e redenção. Um dos maiores sucessos da fantasia brasileira, escrito por Eduardo Spohr.",
    imagem: "img/a-batalha-do-apocalipse.jpg",
    dataAdicao: "2026-06-08"
  },

  {
    titulo: "A Hora da Estrela",
    destaque: true,
    autor: "Clarice Lispector",
    genero: "Romance & Literatura",
    preco: "R$ 40,00",
    estoque: 1,
    estado: "Estado perfeito",
    sinopse: "A última obra de Clarice Lispector acompanha Macabéa, uma jovem nordestina pobre e ingênua que tenta sobreviver na cidade grande. Uma narrativa intensa e comovente sobre solidão, existência e a busca por sentido — um dos maiores clássicos da literatura brasileira.",
    imagem: "img/a-hora-da-estrela.jpg",
    dataAdicao: "2026-06-27"
  },

  {
    titulo: "O Príncipe Cruel",
    destaque: true,
    autor: "Holly Black",
    genero: "Romance & Literatura",
    preco: "R$ 55,00",
    estoque: 1,
    estado: "Estado perfeito",
    sinopse: "Levada ainda criança para o traiçoeiro e fascinante mundo das fadas, Jude luta para conquistar seu lugar entre a nobreza imortal — e se vê em meio à crueldade do príncipe Cardan, em uma trama de intrigas, poder e desejo. Primeiro livro da aclamada trilogia O Povo do Ar, de Holly Black.",
    imagem: "img/o-principe-cruel.jpg",
    dataAdicao: "2026-06-27"
  },

  {
    titulo: "your name.",
    destaque: true,
    autor: "Makoto Shinkai",
    genero: "Romance & Literatura",
    preco: "R$ 45,00",
    estoque: 1,
    estado: "Ótimo estado",
    sinopse: "Mitsuha, uma garota presa numa cidadezinha, e Taki, um garoto de Tóquio, começam misteriosamente a trocar de corpo enquanto dormem. Entre confusões e risadas, nasce um laço profundo entre os dois — até descobrirem um segredo que desafia o tempo e a distância. O romance escrito por Makoto Shinkai que deu origem ao aclamado filme de animação.",
    imagem: "img/your-name.jpg",
    dataAdicao: "2026-06-27"
  },

  /* ===================== SUSPENSE & TERROR ===================== */

  {
    titulo: "Saboroso Cadáver",
    destaque: true,
    autor: "Agustina Bazterrica",
    genero: "Suspense & Terror",
    preco: "R$ 45,00",
    estoque: 1,
    estado: "Estado perfeito",
    sinopse: "Em um futuro distópico no qual a carne animal se tornou tóxica, a humanidade passa a criar e consumir seres humanos de forma legalizada. Vencedor do Prêmio Clarín de Romance, este perturbador best-seller de Agustina Bazterrica é uma crítica feroz e visceral à sociedade de consumo.",
    imagem: "img/saboroso-cadaver.jpg",
    dataAdicao: "2026-06-27"
  },

  {
    titulo: "O Chamado de Cthulhu e Outros Contos",
    destaque: true,
    autor: "H. P. Lovecraft",
    genero: "Suspense & Terror",
    preco: "R$ 20,00",
    estoque: 1,
    estado: "Estado perfeito",
    sinopse: "Uma coletânea com os contos mais marcantes de H. P. Lovecraft, mestre do horror cósmico. Entidades ancestrais, cultos secretos e o terror do desconhecido se revelam em histórias que influenciaram gerações de escritores e fãs do gênero.",
    imagem: "img/o-chamado-de-cthulhu.jpg",
    dataAdicao: "2026-06-27"
  },

  /* ========================== MANGÁS ========================== */

  {
    titulo: "Berserk – Vol. 1",
    destaque: true,
    autor: "Kentaro Miura",
    genero: "Mangás",
    preco: "R$ 45,00",
    estoque: 1,
    estado: "Estado perfeito",
    sinopse: "Em um mundo medieval sombrio e brutal, Guts, o Espadachim Negro, percorre as terras empunhando uma espada gigantesca e caçando demônios em busca de vingança. O primeiro volume da obra-prima de Kentaro Miura, um dos maiores clássicos da dark fantasy de todos os tempos.",
    imagem: "img/berserk-vol-1.jpg",
    dataAdicao: "2026-06-27"
  },

  {
    titulo: "The Promised Neverland – Vol. 1",
    destaque: true,
    autor: "Kaiu Shirai e Posuka Demizu",
    genero: "Mangás",
    preco: "R$ 30,00",
    estoque: 1,
    estado: "Estado perfeito",
    sinopse: "Emma, Norman e Ray vivem felizes no orfanato Grace Field House — até descobrirem a verdade aterrorizante por trás de seu lar perfeito. Agora precisam bolar um plano de fuga ousado antes que seja tarde demais. Primeiro volume de um dos mangás de suspense mais aclamados dos últimos anos, com roteiro de Kaiu Shirai e arte de Posuka Demizu.",
    imagem: "img/the-promised-neverland-vol-1.jpg",
    dataAdicao: "2026-06-27"
  },

  {
    titulo: "Demon Slayer – Vol. 1",
    destaque: true,
    autor: "Koyoharu Gotouge",
    genero: "Mangás",
    preco: "R$ 50,00",
    estoque: 1,
    estado: "Ótimo estado",
    sinopse: "Depois de ter a família massacrada por um demônio e ver a irmã, Nezuko, transformada em um deles, Tanjiro Kamado parte numa jornada para se tornar um caçador de demônios e devolver a humanidade à irmã. O primeiro volume de Kimetsu no Yaiba (Demon Slayer), de Koyoharu Gotouge — um dos maiores fenômenos dos mangás.",
    imagem: "img/demon-slayer-vol-1.jpg",
    dataAdicao: "2026-06-27"
  }

];
