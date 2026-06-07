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
   COMO EDITAR UM LIVRO:
   --------------------------------------------------------------
   Basta mudar o texto entre as aspas " " do campo que quiser.
   Atenção: NÃO apague as aspas, nem a vírgula no final da linha.

   --------------------------------------------------------------
   COMO REMOVER UM LIVRO:
   --------------------------------------------------------------
   Apague o bloco inteiro do livro, das chaves { até a },
   incluindo a vírgula do final.

   --------------------------------------------------------------
   SIGNIFICADO DE CADA CAMPO:
   --------------------------------------------------------------
   titulo  -> Nome do livro (ex: "O Alquimista")
   autor   -> Nome do autor (ex: "Paulo Coelho")
   preco   -> Preço com R$ (ex: "R$ 32,00")
   estoque -> Quantidade que você tem em casa
              0 = esgotado (selo vermelho, botão desativado)
              1 = "Último!" (selo âmbar)
              2 ou mais = "Disponível" (selo verde)
   estado  -> "Novo", "Seminovo" ou "Usado"
   sinopse -> Um resumo curto do livro (1 a 3 frases)
   imagem  -> Caminho da capa dentro da pasta /img/
              Ex: "img/o-alquimista.jpg"
              Se você ainda não tem a capa, deixe assim: ""
              (o site vai mostrar uma capa bonita automática)

   ============================================================ */

const LIVROS = [

  {
    titulo: "O Alquimista",
    autor: "Paulo Coelho",
    preco: "R$ 32,00",
    estoque: 3,
    estado: "Novo",
    sinopse: "Santiago, um jovem pastor andaluz, parte em busca de um tesouro escondido nas pirâmides do Egito e, no caminho, descobre sua Lenda Pessoal.",
    imagem: ""
  },

  {
    titulo: "Dom Casmurro",
    autor: "Machado de Assis",
    preco: "R$ 24,90",
    estoque: 1,
    estado: "Seminovo",
    sinopse: "Bentinho relembra sua infância, o amor por Capitu e a dúvida que atravessa toda a sua vida adulta. Um clássico absoluto da literatura brasileira.",
    imagem: ""
  },

  {
    titulo: "A Hora da Estrela",
    autor: "Clarice Lispector",
    preco: "R$ 28,00",
    estoque: 2,
    estado: "Novo",
    sinopse: "A história de Macabéa, uma jovem nordestina que vive no Rio de Janeiro, narrada com a sensibilidade única de Clarice em sua última obra publicada em vida.",
    imagem: ""
  },

  {
    titulo: "1984",
    autor: "George Orwell",
    preco: "R$ 39,90",
    estoque: 0,
    estado: "Novo",
    sinopse: "Em um futuro sombrio, Winston Smith tenta resistir ao controle total do Partido e do Grande Irmão. Um dos romances mais importantes do século XX.",
    imagem: ""
  },

  {
    titulo: "Memórias Póstumas de Brás Cubas",
    autor: "Machado de Assis",
    preco: "R$ 26,50",
    estoque: 4,
    estado: "Usado",
    sinopse: "Um defunto-autor escreve, do além-túmulo, as memórias irônicas e provocadoras de sua vida medíocre. Marco do realismo na literatura brasileira.",
    imagem: ""
  }

];
