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
    sinopse: "Baseado no estudo de centenas de pessoas bem-sucedidas, Napoleon Hill revela os 13 princípios que conduzem à riqueza e à realização pessoal. Um dos maiores clássicos do desenvolvimento financeiro de todos os tempos.",
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
    sinopse: "Philip Kotler, o pai do marketing moderno, apresenta a transição do marketing tradicional para o digital, mostrando como conquistar clientes na era da conectividade integrando o online e o offline.",
    imagem: "img/marketing-4-0.jpg"
  },

  /* ============= AUTOAJUDA & DESENVOLVIMENTO PESSOAL ============= */

  {
    titulo: "O Poder do Subconsciente",
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
    autor: "Dale Carnegie",
    genero: "Autoajuda & Desenvolvimento Pessoal",
    preco: "R$ 25,00",
    estoque: 1,
    estado: "Bom estado, porém grifado",
    sinopse: "O clássico definitivo sobre relações humanas. Dale Carnegie ensina princípios práticos para se comunicar melhor, conquistar a confiança das pessoas e influenciar positivamente quem está ao seu redor.",
    imagem: "img/como-fazer-amigos.jpg"
  },

  {
    titulo: "Como Convencer Alguém em 90 Segundos",
    autor: "Nicholas Boothman",
    genero: "Autoajuda & Desenvolvimento Pessoal",
    preco: "R$ 30,00",
    estoque: 1,
    estado: "Bom estado, porém grifado",
    sinopse: "Nicholas Boothman apresenta técnicas de comunicação e linguagem corporal para criar conexões instantâneas e causar uma primeira impressão marcante em qualquer situação.",
    imagem: "img/como-convencer-90-segundos.jpg"
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
    titulo: "Do Átomo ao Buraco Negro",
    autor: "Schwarza",
    genero: "Ciência & Curiosidades",
    preco: "R$ 50,00",
    estoque: 1,
    estado: "Bom estado",
    sinopse: "Do criador do canal Poligonautas, uma viagem descomplicada pela astronomia — do menor dos átomos aos misteriosos buracos negros — explicando os segredos do universo de forma simples e divertida.",
    imagem: "img/do-atomo-ao-buraco-negro.jpg"
  },

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
    autor: "Emily Brontë",
    genero: "Clássicos da Literatura",
    preco: "R$ 38,00",
    estoque: 1,
    estado: "Novo, lacrado",
    sinopse: "Nas charnecas sombrias da Inglaterra, o amor intenso e destrutivo entre Catherine e Heathcliff atravessa gerações, misturando paixão, vingança e obsessão. O único romance de Emily Brontë é um dos maiores clássicos de todos os tempos.",
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
    sinopse: "Em uma sociedade onde os livros são proibidos e queimados por bombeiros, o bombeiro Guy Montag começa a questionar seu papel. Um clássico distópico sobre censura, conhecimento e liberdade de pensamento.",
    imagem: "img/fahrenheit-451.jpg"
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

  /* ===================== MANGÁS ===================== */

  {
    titulo: "Nana – Vol. 1",
    autor: "Ai Yazawa",
    genero: "Mangás",
    preco: "R$ 55,00",
    estoque: 1,
    estado: "Novo, lacrado",
    sinopse: "Duas garotas chamadas Nana se conhecem por acaso a caminho de Tóquio e acabam dividindo o mesmo apartamento. Entre música, amores e sonhos, Ai Yazawa retrata a amizade e a vida adulta em um dos mangás mais aclamados de todos os tempos.",
    imagem: "img/nana-1.jpg",
    novoAte: "2026-06-18"
  }

];
