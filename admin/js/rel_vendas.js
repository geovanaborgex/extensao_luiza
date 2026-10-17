
"use strict";

/*
 * RELATÓRIO DE VENDAS
 * Fonte atual: localStorage usado pelo caixa.
 */

const CHAVE_VENDAS = "luiza_caixa_vendas_v1";

const $ = (id) => document.getElementById(id);

const elementos = {
  dataInicio: $("dataInicio"),
  dataFim: $("dataFim"),
  pagamento: $("filtroPagamento"),
  cliente: $("filtroCliente"),
  btnFiltrar: $("btnFiltrar"),
  faturamento: $("totalFaturamento"),
  vendas: $("totalVendas"),
  unidades: $("unidadesVendidas"),
  tabelaProdutos: $("tabelaProdutos"),
  tabelaClientes: $("tabelaClientes"),
  tabelaHistorico: $("tabelaHistorico"),
  buscaHistorico: $("buscaHistorico"),
  infoHistorico: $("infoHistorico"),
  aviso: $("avisoDados")
};

let todasVendas = [];
let vendasFiltradas = [];

/* -------------------------
   FORMATAÇÃO
------------------------- */

function moeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function numero(valor) {
  return Number(valor || 0).toLocaleString("pt-BR");
}

function escaparHTML(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, caractere => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[caractere]);
}

function dataLocalISO(data = new Date()) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function formatarData(valor) {
  if (!valor) return "—";

  // Datas ISO, como 2026-10-17 ou 2026-10-17T14:30:00
  const texto = String(valor);
  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (iso) {
    const hora = texto.match(/T(\d{2}):(\d{2})/);
    const data = `${iso[3]}/${iso[2]}/${iso[1]}`;
    return hora ? `${data} ${hora[1]}:${hora[2]}` : data;
  }

  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return texto;

  return data.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

function obterDataISO(valor) {
  if (!valor) return "";

  if (typeof valor === "number") {
    const data = new Date(valor);
    return Number.isNaN(data.getTime()) ? "" : dataLocalISO(data);
  }

  const texto = String(valor);
  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const brasileira = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (brasileira) {
    return `${brasileira[3]}-${brasileira[2]}-${brasileira[1]}`;
  }

  const data = new Date(texto);
  return Number.isNaN(data.getTime()) ? "" : dataLocalISO(data);
}

function primeiroCampo(objeto, campos, padrao = "") {
  for (const campo of campos) {
    if (objeto && objeto[campo] !== undefined &&
        objeto[campo] !== null && objeto[campo] !== "") {
      return objeto[campo];
    }
  }
  return padrao;
}

function converterValor(valor) {
  if (typeof valor === "number") return valor;
  if (valor === null || valor === undefined || valor === "") return 0;

  const texto = String(valor).trim();
  const convertido = texto.includes(",")
    ? Number(texto.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, ""))
    : Number(texto.replace(/[^\d.-]/g, ""));

  return Number.isFinite(convertido) ? convertido : 0;
}

/* -------------------------
   LEITURA DOS DADOS
------------------------- */

function lerVendasSalvas() {
  try {
    const dados = JSON.parse(localStorage.getItem(CHAVE_VENDAS) || "[]");

    if (!Array.isArray(dados)) {
      throw new Error("O conteúdo salvo não é uma lista de vendas.");
    }

    return dados;
  } catch (erro) {
    console.error("Erro ao ler vendas:", erro);
    mostrarAviso(
      "Não foi possível ler as vendas salvas. Confira a chave e o formato dos dados no caixa."
    );
    return [];
  }
}

/*
 * Esta função adapta os dados do caixa ao formato usado no relatório.
 * Se os campos do caixa tiverem outros nomes, ajuste os nomes abaixo.
 */
function normalizarItem(item) {
  if (typeof item === "string") {
    return {
      nome: item,
      quantidade: 1,
      preco: 0,
      subtotal: 0
    };
  }

  const nome = primeiroCampo(item, [
    "nome", "produto", "nomeProduto", "descricao", "name", "titulo"
  ], "Produto sem nome");

  const quantidade = Math.max(0, converterValor(
    primeiroCampo(item, ["quantidade", "qtd", "qty", "unidades"], 1)
  ));

  const preco = converterValor(
    primeiroCampo(item, [
      "preco", "precoUnitario", "valorUnitario", "valor", "price"
    ], 0)
  );

  const subtotalInformado = primeiroCampo(item, [
    "subtotal", "totalItem", "valorTotal"
  ], null);

  const subtotal = subtotalInformado !== null
    ? converterValor(subtotalInformado)
    : quantidade * preco;

  return { nome, quantidade, preco, subtotal };
}

function normalizarVenda(venda, indice) {
  const dataOriginal = primeiroCampo(venda, [
    "data", "dataVenda", "dataHora", "data_hora",
    "criadaEm", "createdAt", "timestamp", "date"
  ], "");

  const clienteOriginal = primeiroCampo(venda, [
    "cliente", "nomeCliente", "clienteNome", "nome_cliente"
  ], "Cliente não informado");

  const cliente = typeof clienteOriginal === "object"
    ? primeiroCampo(clienteOriginal, ["nome", "name", "nomeCliente"], "Cliente não informado")
    : clienteOriginal;

  const pagamento = primeiroCampo(venda, [
    "pagamento", "formaPagamento", "forma_pagamento", "metodoPagamento"
  ], "Não informado");

  const itensOriginais = primeiroCampo(venda, [
    "itens", "produtos", "carrinho", "items", "detalhes"
  ], []);

  let itens = [];

  if (Array.isArray(itensOriginais)) {
    itens = itensOriginais.map(normalizarItem);
  } else if (itensOriginais && typeof itensOriginais === "object") {
    itens = Object.values(itensOriginais).map(normalizarItem);
  }

  const totalInformado = primeiroCampo(venda, [
    "total", "valorTotal", "totalVenda", "valor", "total_venda"
  ], null);

  const totalCalculado = itens.reduce((soma, item) => soma + item.subtotal, 0);
  const total = totalInformado !== null
    ? converterValor(totalInformado)
    : totalCalculado;

  return {
    id: primeiroCampo(venda, ["id", "codigo", "numero", "idVenda"], indice + 1),
    dataOriginal,
    dataISO: obterDataISO(dataOriginal),
    cliente: String(cliente || "Cliente não informado"),
    pagamento: String(pagamento || "Não informado"),
    itens,
    total
  };
}

function carregarVendas() {
  todasVendas = lerVendasSalvas().map(normalizarVenda);
}

/* -------------------------
   FILTROS E INDICADORES
------------------------- */

function filtrarVendas() {
  const inicio = elementos.dataInicio.value;
  const fim = elementos.dataFim.value;
  const pagamento = elementos.pagamento.value.toLocaleLowerCase("pt-BR");
  const cliente = elementos.cliente.value.trim().toLocaleLowerCase("pt-BR");

  vendasFiltradas = todasVendas.filter(venda => {
    if (inicio && (!venda.dataISO || venda.dataISO < inicio)) return false;
    if (fim && (!venda.dataISO || venda.dataISO > fim)) return false;

    if (pagamento &&
        venda.pagamento.toLocaleLowerCase("pt-BR") !== pagamento) {
      return false;
    }

    if (cliente &&
        !venda.cliente.toLocaleLowerCase("pt-BR").includes(cliente)) {
      return false;
    }

    return true;
  });

  renderizarIndicadores();
  renderizarProdutosMaisVendidos();
  renderizarClientesMaisAtivos();
  renderizarHistorico();
}

function renderizarIndicadores() {
  const faturamento = vendasFiltradas.reduce((soma, venda) => soma + venda.total, 0);
  const unidades = vendasFiltradas.reduce(
    (soma, venda) => soma + venda.itens.reduce((s, item) => s + item.quantidade, 0),
    0
  );

  elementos.faturamento.textContent = moeda(faturamento);
  elementos.vendas.textContent = numero(vendasFiltradas.length);
  elementos.unidades.textContent = numero(unidades);
}

/* -------------------------
   RANKING DE PRODUTOS
------------------------- */

function renderizarProdutosMaisVendidos() {
  const mapa = new Map();

  vendasFiltradas.forEach(venda => {
    venda.itens.forEach(item => {
      const nome = item.nome;
      if (!mapa.has(nome)) {
        mapa.set(nome, { nome, quantidade: 0, faturamento: 0 });
      }

      const registro = mapa.get(nome);
      registro.quantidade += item.quantidade;
      registro.faturamento += item.subtotal;
    });
  });

  const ranking = [...mapa.values()]
    .sort((a, b) => b.quantidade - a.quantidade || b.faturamento - a.faturamento)
    .slice(0, 10);

  if (!ranking.length) {
    elementos.tabelaProdutos.innerHTML =
      '<tr><td colspan="3" class="vazio">Nenhum produto vendido neste período.</td></tr>';
    return;
  }

  elementos.tabelaProdutos.innerHTML = ranking.map((item, indice) => `
    <tr>
      <td>${indice + 1}. ${escaparHTML(item.nome)}</td>
      <td>${numero(item.quantidade)}</td>
      <td class="valor">${moeda(item.faturamento)}</td>
    </tr>
  `).join("");
}

/* -------------------------
   RANKING DE CLIENTES
------------------------- */

function renderizarClientesMaisAtivos() {
  const mapa = new Map();

  vendasFiltradas.forEach(venda => {
    const nome = venda.cliente.trim() || "Cliente não informado";
    const chave = nome.toLocaleLowerCase("pt-BR");

    if (!mapa.has(chave)) {
      mapa.set(chave, {
        nome,
        compras: 0,
        total: 0,
        ultimaCompra: ""
      });
    }

    const cliente = mapa.get(chave);
    cliente.compras++;
    cliente.total += venda.total;

    if (venda.dataISO > cliente.ultimaCompra) {
      cliente.ultimaCompra = venda.dataISO;
    }
  });

  const ranking = [...mapa.values()]
    .sort((a, b) => b.total - a.total || b.compras - a.compras)
    .slice(0, 10);

  if (!ranking.length) {
    elementos.tabelaClientes.innerHTML =
      '<tr><td colspan="3" class="vazio">Nenhum cliente encontrado neste período.</td></tr>';
    return;
  }

  elementos.tabelaClientes.innerHTML = ranking.map((cliente, indice) => `
    <tr title="Última compra: ${escaparHTML(
      cliente.ultimaCompra ? formatarData(cliente.ultimaCompra) : "—"
    )}">
      <td>${indice + 1}. ${escaparHTML(cliente.nome)}</td>
      <td>${numero(cliente.compras)}</td>
      <td class="valor">${moeda(cliente.total)}</td>
    </tr>
  `).join("");
}

/* -------------------------
   HISTÓRICO DETALHADO
------------------------- */

function renderizarHistorico() {
  const busca = elementos.buscaHistorico.value.trim().toLocaleLowerCase("pt-BR");

  const lista = vendasFiltradas
    .filter(venda => {
      if (!busca) return true;

      const nomesProdutos = venda.itens.map(item => item.nome).join(" ");
      const texto = [
        venda.cliente,
        venda.pagamento,
        nomesProdutos,
        venda.id
      ].join(" ").toLocaleLowerCase("pt-BR");

      return texto.includes(busca);
    })
    .sort((a, b) => {
      const dataA = a.dataISO || "";
      const dataB = b.dataISO || "";
      return dataB.localeCompare(dataA);
    });

  elementos.infoHistorico.textContent =
    `${lista.length} ${lista.length === 1 ? "venda encontrada" : "vendas encontradas"}`;

  if (!lista.length) {
    elementos.tabelaHistorico.innerHTML =
      '<tr><td colspan="5" class="vazio">Nenhuma venda corresponde à pesquisa.</td></tr>';
    return;
  }

  elementos.tabelaHistorico.innerHTML = lista.map(venda => {
    const produtosTexto = venda.itens.length
      ? venda.itens.map(item =>
          `${escaparHTML(item.nome)} (${numero(item.quantidade)})`
        ).join(", ")
      : "Itens não registrados";

    return `
      <tr>
        <td>${escaparHTML(formatarData(venda.dataOriginal))}</td>
        <td>${escaparHTML(venda.cliente)}</td>
        <td style="white-space:normal; min-width:180px">${produtosTexto}</td>
        <td><span class="badge-pagamento">${escaparHTML(venda.pagamento)}</span></td>
        <td class="valor">${moeda(venda.total)}</td>
      </tr>
    `;
  }).join("");
}

/* -------------------------
   AVISOS E INICIALIZAÇÃO
------------------------- */

function mostrarAviso(mensagem) {
  elementos.aviso.textContent = mensagem;
  elementos.aviso.classList.add("visivel");
}

function inicializarDatas() {
  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

  elementos.dataInicio.value = dataLocalISO(inicioMes);
  elementos.dataFim.value = dataLocalISO(hoje);
}

function inicializarRelatorio() {
  inicializarDatas();
  carregarVendas();

  if (todasVendas.length === 0) {
    mostrarAviso(
      "Nenhuma venda foi encontrada na chave luiza_caixa_vendas_v1 deste navegador. Verifique se o caixa está salvando as vendas nessa chave."
    );
  }

  filtrarVendas();
}

elementos.btnFiltrar.addEventListener("click", filtrarVendas);
elementos.buscaHistorico.addEventListener("input", renderizarHistorico);
elementos.cliente.addEventListener("keydown", evento => {
  if (evento.key === "Enter") filtrarVendas();
});
elementos.pagamento.addEventListener("change", filtrarVendas);
elementos.dataInicio.addEventListener("change", filtrarVendas);
elementos.dataFim.addEventListener("change", filtrarVendas);

window.addEventListener("storage", evento => {
  if (evento.key === CHAVE_VENDAS) {
    carregarVendas();
    filtrarVendas();
  }
});

inicializarRelatorio();
