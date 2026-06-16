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
              "Clássicos da Literatura"
              "Romance & Literatura"
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
   novoAte -> (opcional) Até essa data o livro aparece em destaque
              na seção "Novidades", no topo do site. Use o formato
              "ANO-MÊS-DIA". Depois da data ele sai de lá sozinho
              (mas continua na categoria normal).
              Ex: novoAte: "2026-06-18"

   ============================================================ */

/* ============================================================
   PROMOÇÃO POR TEMPO LIMITADO
   ============================================================
   O bloco abaixo controla a promoção do site inteiro.
   Ela LIGA e DESLIGA SOZINHA pelas datas — não precisa mexer
   em mais nada, nem lembrar de desfazer depois.

   inicio / fim    -> primeiro e último dia da promoção ("ANO-MÊS-DIA")
   descontoUm      -> % de desconto comprando 1 livro
   descontoDupla   -> % de desconto EM CADA livro comprando 2 ou mais

   Para VER a promoção antes da data, abra o site assim:
   index.html?promo=teste

   Para fazer OUTRA promoção no futuro (Natal, aniversário...),
   basta trocar o nome, as datas e os percentuais aqui.

   Dica: livros com a linha  descontoMaximo: 10  nunca passam
   de 10% de desconto, mesmo na dupla (bom para livros caros
   ou lacrados, em que 20% pesaria demais na margem).
   ============================================================ */

const PROMOCAO = {
  nome: "Dia dos Namorados",
  inicio: "2026-06-11", // ativada já na véspera
  fim: "2026-06-17",
  descontoUm: 10,
  descontoDupla: 20,
  brindeDupla: "um caderno de anotações de brinde" // ganho na compra de 2 livros ou mais
};

const LIVROS = [

  /* ===================== FINANÇAS & NEGÓCIOS ===================== */

  {
    titulo: "Quem Pensa Enriquece",
    autor: "Napoleon Hill",
    genero: "Finanças & Negócios",
    preco: "R$ 20,00",
    estoque: 1,
    estado: "Bom estado, porém grifado",
    sinopse: "Baseado no estudo de centenas de pessoas bem-sucedidas, Napoleon Hill revela os 13 princípios que conduzem à riqueza e à realização pessoal. Um dos maiores clássicos do desenvolvim[...]
    imagem: "img/quem-pensa-enriquece.jpg"
  },

  {
    titulo: "O Homem Mais Rico da Babilônia",
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
    estoque: 2,
    estado: "Bom estado",
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
    sinopse: "Philip Kotler, o pai do marketing moderno, apresenta a transição do marketing tradicional para o digital, mostrando como conquistar clientes na era da conectividade integrando o online[...]
    imagem: "img/marketing-4-0.jpg"
  },

  {
    titulo: "A Estrada do Futuro",
    autor: "Bill Gates",
    genero: "Finanças & Negócios",
    preco: "R$ 30,00",
    estoque: 1,
    estado: "Quase novo",
    sinopse: "Escrito pelo fundador da Microsoft, este clássico apresenta a visão de Bill Gates sobre a revolução digital e o impacto da internet e dos computadores no futuro do trabalho, da educa[...]
    imagem: "img/a-estrada-do-futuro.jpg",
    novoAte: "2026-06-21"
  },

  /* ============= AUTOAJUDA & DESENVOLVIMENTO PESSOAL ============= */

  {
    titulo: "O Poder do Subconsciente",
    autor: "Dr. Joseph Murphy",
    genero: "Autoajuda & Desenvolvimento Pessoal",
    preco: "R$ 25,00",
    estoque: 1,
    estado: "Bom estado, porém grifado",
    sinopse: "Joseph Murphy revela como a mente subconsciente pode ser programada para transformar pensamentos em realidade, alcançando saúde, prosperidade e felicidade através de técnicas prátic[...]
    imagem: "img/o-poder-do-subconsciente.jpg"
  },

  {
    titulo: "Como Fazer Amigos e Influenciar Pessoas",
    autor: "Dale Carnegie",
    genero: "Autoajuda & Desenvolvimento Pessoal",
    preco: "R$ 25,00",
    estoque: 1,
    estado: "Bom estado, porém grifado",
    sinopse: "O clássico definitivo sobre relações humanas. Dale Carnegie ensina princípios práticos para se comunicar melhor, conquistar a confiança das pessoas e influenciar positivamente quem[...]
    imagem: "img/como-fazer-amigos.jpg"
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
    sinopse: "Um órfão enfrenta a miséria e a exploração na Londres do século XIX, passando por orfanatos, gangues de batedores de carteira e muitas reviravoltas, em um dos romances mais célebr[...]
    imagem: "img/oliver-twist.jpg"
  },

  {
    titulo: "A Volta ao Mundo em 80 Dias",
    autor: "Júlio Verne",
    genero: "Clássicos da Literatura",
    preco: "R$ 40,00",
    estoque: 1,
    estado: "Estado perfeito",
    sinopse: "O excêntrico inglês Phileas Fogg aposta que consegue dar a volta ao mundo em apenas 80 dias. Ao lado de seu criado Passepartout, embarca em uma aventura cheia de imprevistos pelos quat[...]
    imagem: "img/a-volta-ao-mundo-em-80-dias.jpg"
  },

  {
    titulo: "O Morro dos Ventos Uivantes",
    autor: "Emily Brontë",
    genero: "Clássicos da Literatura",
    preco: "R$ 38,00",
    estoque: 1,
    estado: "Novo, lacrado",
    sinopse: "Nas charnecas sombrias da Inglaterra, o amor intenso e destrutivo entre Catherine e Heathcliff atravessa gerações, misturando paixão, vingança e obsessão. O único romance de Emily [...]
    imagem: "img/o-morro-dos-ventos-uivantes.jpg",
    novoAte: "2026-06-18"
  },

  {
    titulo: "Fahrenheit 451",
    autor: "Ray Bradbury",
    genero: "Clássicos da Literatura",
    preco: "R$ 35,00",
    estoque: 1,
    estado: "Com marcas de uso",
    sinopse: "Em uma sociedade onde os livros são proibidos e queimados por bombeiros, o bombeiro Guy Montag começa a questionar seu papel. Um clássico distópico sobre censura, conhecimento e libe[...]
    imagem: "img/fahrenheit-451.jpg"
  },

  {
    titulo: "1984",
    autor: "George Orwell",
    genero: "Clássicos da Literatura",
    preco: "R$ 30,00",
    estoque: 1,
    estado: "Quase novo",
    sinopse: "Em uma sociedade dominada por um Estado totalitário e vigiada pelo onipresente Grande Irmão, Winston Smith tenta resistir ao controle absoluto do pensamento. Uma das distopias mais inf[...]
    imagem: "img/1984.jpg",
    novoAte: "2026-06-21"
  },

  {
    titulo: "A Revolução dos Bichos",
    autor: "George Orwell",
    genero: "Clássicos da Literatura",
    preco: "R$ 30,00",
    estoque: 1,
    estado: "Quase novo",
    sinopse: "Cansados da exploração humana, os animais de uma fazenda se rebelam e tomam o poder em nome da igualdade. Mas o sonho logo se corrompe, nesta fábula afiada de George Orwell sobre pode[...]
    imagem: "img/a-revolucao-dos-bichos.jpg",
    novoAte: "2026-06-21"
  },

  {
    titulo: "Dentro da Baleia e Outros Ensaios",
    autor: "George Orwell",
    genero: "Clássicos da Literatura",
    preco: "R$ 25,00",
    estoque: 1,
    estado: "Quase novo",
    sinopse: "Uma reunião de ensaios de George Orwell que revela seu olhar agudo sobre literatura, política e a sociedade de seu tempo. Textos lúcidos e provocadores que mostram por que Orwell é u[...]
    imagem: "img/dentro-da-baleia-e-outros-ensaios.jpg",
    novoAte: "2026-06-21"
  },

  {
    titulo: "As Aventuras de Sherlock Holmes – Vol. 1",
    autor: "Arthur Conan Doyle",
    genero: "Clássicos da Literatura",
    preco: "R$ 30,00",
    estoque: 1,
    estado: "Quase novo",
    sinopse: "O primeiro volume das aventuras do mais famoso detetive de todos os tempos. Ao lado do fiel Dr. Watson, Sherlock Holmes usa sua genialidade dedutiva para desvendar mistérios intrigantes[...]
    imagem: "img/sherlock-holmes-vol-1.jpg",
    novoAte: "2026-06-21"
  },

  {
    titulo: "As Aventuras de Sherlock Holmes – Vol. 2",
    autor: "Arthur Conan Doyle",
    genero: "Clássicos da Literatura",
    preco: "R$ 30,00",
    estoque: 1,
    estado: "Quase novo",
    sinopse: "A continuação das clássicas aventuras de Sherlock Holmes e Dr. Watson. Novos casos, enigmas e crimes desafiam a mente brilhante do detetive de Baker Street, em histórias imortais de [...]
    imagem: "img/sherlock-holmes-vol-2.jpg",
    novoAte: "2026-06-21"
  },

  {
    titulo: "As Aventuras de Sherlock Holmes – Vol. 3",
    autor: "Arthur Conan Doyle",
    genero: "Clássicos da Literatura",
    preco: "R$ 30,00",
    estoque: 1,
    estado: "Quase novo",
    sinopse: "O terceiro volume das aventuras de Sherlock Holmes reúne mais casos memoráveis do detetive mais célebre da literatura. Dedução, suspense e a inconfundível parceria com o Dr. Watson[...]
    imagem: "img/sherlock-holmes-vol-3.jpg",
    novoAte: "2026-06-21"
  },

  /* ===================== ROMANCE & LITERATURA ===================== */

  {
    titulo: "O Guardião do Tempo",
    autor: "Mitch Albom",
    genero: "Romance & Literatura",
    preco: "R$ 20,00",
    estoque: 1,
    estado: "Bom estado",
    sinopse: "Pai Tempo, o homem que inventou a medição das horas, é condenado a viver isolado por milênios. Para se redimir, precisa ensinar o verdadeiro significado do tempo a duas pessoas na Te[...]
    imagem: "img/o-guardiao-do-tempo.jpg"
  },

  {
    titulo: "O Xangô de Baker Street",
    autor: "Jô Soares",
    genero: "Romance & Literatura",
    preco: "R$ 30,00",
    estoque: 1,
    estado: "Bom estado",
    sinopse: "No Rio de Janeiro do final do século XIX, Sherlock Holmes é convocado para resolver um misterioso caso de assassinatos. Jô Soares mistura humor, história e suspense neste best-seller[...]
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

  {
    titulo: "A Batalha do Apocalipse",
    autor: "Eduardo Spohr",
    genero: "Romance & Literatura",
    preco: "R$ 25,00",
    estoque: 1,
    estado: "Com marcas de uso",
    sinopse: "Da queda dos anjos ao crepúsculo do mundo: o anjo guerreiro Ablon atravessa milênios em uma epopeia sobre amor, traição e redenção. Um dos maiores sucessos da fantasia brasileira, [...]
    imagem: "img/a-batalha-do-apocalipse.jpg",
    novoAte: "2026-06-21"
  }

];
