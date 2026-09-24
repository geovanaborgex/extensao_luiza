document.addEventListener("DOMContentLoaded", function () {

    // ============================================================
    // CONFIGURAÇÕES
    // ============================================================

    Chart.defaults.font.family = "Poppins";
    Chart.defaults.font.size = 12;
    Chart.defaults.plugins.legend.labels.usePointStyle = true;

    let graficos = {};

    const mesesNomes = [
        "Janeiro",
        "Fevereiro",
        "Março",
        "Abril",
        "Maio",
        "Junho",
        "Julho",
        "Agosto",
        "Setembro",
        "Outubro",
        "Novembro",
        "Dezembro"
    ];


    // ============================================================
    // ELEMENTOS
    // ============================================================

    const seletorAno = document.getElementById("ano");


    // ============================================================
    // FORMATA MOEDA
    // ============================================================

    function formatarMoeda(valor) {

        return Number(valor || 0).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });

    }


    // ============================================================
    // FORMATA NÚMERO
    // ============================================================

    function formatarNumero(valor) {

        return Number(valor || 0).toLocaleString("pt-BR");

    }


    // ============================================================
    // DESTRUIR GRÁFICOS ANTERIORES
    // ============================================================

    function destruirGraficos() {

        Object.values(graficos).forEach(function (grafico) {

            if (grafico) {
                grafico.destroy();
            }

        });

        graficos = {};

    }


    // ============================================================
    // ATUALIZA CARD PRINCIPAL
    // ============================================================

    function atualizarCards(dados) {

        const resumo = dados.resumo;
        const destaque = dados.destaques;


        // --------------------------------------------------------
        // CARD PROCEDIMENTO CARRO-CHEFE
        // --------------------------------------------------------

        const cardDestaque =
            document.querySelector(".card.destaque");

        if (cardDestaque) {

            const nome =
                destaque.procedimentoMaisRealizado?.nome
                || "Nenhum";

            const quantidade =
                destaque.procedimentoMaisRealizado?.quantidade
                || 0;

            const h2 = cardDestaque.querySelector("h2");
            const p = cardDestaque.querySelector("p");

            if (h2) {
                h2.textContent = nome;
            }

            if (p) {

                p.innerHTML =
                    "<strong>" +
                    formatarNumero(quantidade) +
                    "</strong> atendimentos no ano";

            }

        }


        // --------------------------------------------------------
        // TOTAL DE ATENDIMENTOS
        // --------------------------------------------------------

        const cards =
            document.querySelectorAll(".cards-principais .card");


        if (cards.length >= 4) {

            // Card 2
            const h2Atendimentos =
                cards[1].querySelector("h2");

            if (h2Atendimentos) {

                h2Atendimentos.textContent =
                    formatarNumero(
                        resumo.totalAgendamentos
                    );

            }


            // Card 3 - faturamento
            const h2Faturamento =
                cards[2].querySelector("h2");

            if (h2Faturamento) {

                h2Faturamento.textContent =
                    formatarMoeda(
                        resumo.faturamentoTotal
                    );

            }


            // Card 4 - clientes
            const h2Clientes =
                cards[3].querySelector("h2");

            if (h2Clientes) {

                h2Clientes.textContent =
                    formatarNumero(
                        resumo.clientesUnicos
                    );

            }

        }

    }


    // ============================================================
    // ATUALIZA DESTAQUES DO ANO
    // ============================================================

    function atualizarDestaques(dados) {

        const destaques =
            dados.destaques;

        const graficosDados =
            dados.graficos;


        const miniDestaques =
            document.querySelectorAll(".mini-destaque");


        if (miniDestaques.length < 5) {
            return;
        }


        // ========================================================
        // 1 - PROCEDIMENTO CAMPEÃO
        // ========================================================

        const procedimento =
            destaques.procedimentoMaisRealizado;

        if (procedimento) {

            miniDestaques[0]
                .querySelector("strong")
                .textContent = procedimento.nome;

            miniDestaques[0]
                .querySelector("p")
                .textContent =
                formatarNumero(procedimento.quantidade)
                + " atendimentos";

        } else {

            miniDestaques[0]
                .querySelector("strong")
                .textContent = "Nenhum";

            miniDestaques[0]
                .querySelector("p")
                .textContent = "0 atendimentos";

        }


        // ========================================================
        // 2 - MÊS COM MAIS ATENDIMENTOS
        // ========================================================

        const mesMovimento =
            destaques.mesMaisMovimentado;

        if (mesMovimento) {

            miniDestaques[1]
                .querySelector("strong")
                .textContent =
                mesMovimento.mes;

            miniDestaques[1]
                .querySelector("p")
                .textContent =
                formatarNumero(
                    mesMovimento.quantidade
                )
                + " atendimentos";

        }


        // ========================================================
        // 3 - MAIOR FATURAMENTO
        // ========================================================

        const faturamentoMensal =
            graficosDados.meses.faturamento;

        let maiorFaturamento = 0;
        let mesMaiorFaturamento = 0;

        faturamentoMensal.forEach(
            function (valor, index) {

                if (Number(valor) > maiorFaturamento) {

                    maiorFaturamento =
                        Number(valor);

                    mesMaiorFaturamento =
                        index;

                }

            }
        );


        miniDestaques[2]
            .querySelector("strong")
            .textContent =
            mesesNomes[mesMaiorFaturamento];

        miniDestaques[2]
            .querySelector("p")
            .textContent =
            formatarMoeda(
                maiorFaturamento
            );


        // ========================================================
        // 4 - CLIENTE MAIS FREQUENTE
        // ========================================================

        const cliente =
            destaques.clienteMaisFrequente;

        if (cliente) {

            miniDestaques[3]
                .querySelector("strong")
                .textContent =
                cliente.nome;

            miniDestaques[3]
                .querySelector("p")
                .textContent =
                formatarNumero(
                    cliente.agendamentos
                )
                + " atendimentos";

        } else {

            miniDestaques[3]
                .querySelector("strong")
                .textContent =
                "Nenhum";

            miniDestaques[3]
                .querySelector("p")
                .textContent =
                "0 atendimentos";

        }


        // ========================================================
        // 5 - DIA MAIS MOVIMENTADO
        // ========================================================

        const dia =
            destaques.diaMaisMovimentado;

        if (dia && dia.dia) {

            miniDestaques[4]
                .querySelector("strong")
                .textContent =
                dia.dia;

            miniDestaques[4]
                .querySelector("p")
                .textContent =
                formatarNumero(
                    dia.quantidade
                )
                + " atendimentos";

        } else {

            miniDestaques[4]
                .querySelector("strong")
                .textContent =
                "Nenhum";

            miniDestaques[4]
                .querySelector("p")
                .textContent =
                "0 atendimentos";

        }


        // ========================================================
        // TÍTULO "DESTAQUES DE 2026"
        // ========================================================

        const tituloDestaques =
            document.querySelector(".destaques .titulo-secao h2");

        if (tituloDestaques) {

            tituloDestaques.textContent =
                "Destaques de " + dados.ano;

        }

    }


    // ============================================================
    // 1. GRÁFICO - ATENDIMENTOS POR MÊS
    // ============================================================

    function criarGraficoAtendimentos(dados) {

        const elemento =
            document.getElementById(
                "graficoAtendimentos"
            );

        if (!elemento) {
            return;
        }


        graficos.atendimentos =
            new Chart(elemento, {

                type: "bar",

                data: {

                    labels:
                        dados.graficos.meses.labels,

                    datasets: [{

                        label: "Atendimentos",

                        data:
                            dados.graficos.meses.agendamentos,

                        borderRadius: 8,

                        backgroundColor: "#6B6E55",

                        hoverBackgroundColor:
                            "#575945"

                    }]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    plugins: {

                        legend: {
                            display: false
                        },

                        tooltip: {

                            callbacks: {

                                label: function (context) {

                                    return (
                                        context.raw +
                                        " atendimentos"
                                    );

                                }

                            }

                        }

                    },

                    scales: {

                        y: {

                            beginAtZero: true,

                            ticks: {
                                precision: 0
                            },

                            grid: {
                                color: "#eeeeee"
                            }

                        },

                        x: {

                            grid: {
                                display: false
                            }

                        }

                    }

                }

            });

    }


    // ============================================================
    // 2. GRÁFICO - FATURAMENTO POR MÊS
    // ============================================================

    function criarGraficoFaturamento(dados) {

        const elemento =
            document.getElementById(
                "graficoFaturamento"
            );

        if (!elemento) {
            return;
        }


        graficos.faturamento =
            new Chart(elemento, {

                type: "line",

                data: {

                    labels:
                        dados.graficos.meses.labels,

                    datasets: [{

                        label: "Faturamento",

                        data:
                            dados.graficos.meses.faturamento,

                        borderColor: "#C9A86A",

                        backgroundColor:
                            "rgba(201, 168, 106, 0.12)",

                        fill: true,

                        tension: 0.4,

                        pointRadius: 4,

                        pointHoverRadius: 6

                    }]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    plugins: {

                        legend: {
                            display: false
                        },

                        tooltip: {

                            callbacks: {

                                label: function (context) {

                                    return formatarMoeda(
                                        context.raw
                                    );

                                }

                            }

                        }

                    },

                    scales: {

                        y: {

                            beginAtZero: true,

                            ticks: {

                                callback: function (value) {

                                    return "R$ " +
                                        Number(value)
                                        .toLocaleString(
                                            "pt-BR"
                                        );

                                }

                            },

                            grid: {
                                color: "#eeeeee"
                            }

                        },

                        x: {

                            grid: {
                                display: false
                            }

                        }

                    }

                }

            });

    }


    // ============================================================
    // 3. PROCEDIMENTOS
    // ============================================================

    function criarGraficoProcedimentos(dados) {

        const elemento =
            document.getElementById(
                "graficoProcedimentos"
            );

        if (!elemento) {
            return;
        }


        const lista =
            dados.graficos.procedimentos || [];


        // Mostra os 6 mais realizados
        const top =
            lista.slice(0, 6);


        graficos.procedimentos =
            new Chart(elemento, {

                type: "bar",

                data: {

                    labels:
                        top.map(
                            item => item.nome
                        ),

                    datasets: [{

                        label: "Quantidade",

                        data:
                            top.map(
                                item => item.quantidade
                            ),

                        backgroundColor:
                            "#6B6E55",

                        borderRadius: 8

                    }]

                },

                options: {

                    indexAxis: "y",

                    responsive: true,

                    maintainAspectRatio: false,

                    plugins: {

                        legend: {
                            display: false
                        },

                        tooltip: {

                            callbacks: {

                                label: function (context) {

                                    return (
                                        context.raw +
                                        " atendimentos"
                                    );

                                }

                            }

                        }

                    },

                    scales: {

                        x: {

                            beginAtZero: true,

                            ticks: {
                                precision: 0
                            },

                            grid: {
                                color: "#eeeeee"
                            }

                        },

                        y: {

                            grid: {
                                display: false
                            }

                        }

                    }

                }

            });

    }


    // ============================================================
    // 4. CLIENTES MAIS FREQUENTES
    // ============================================================

    function criarGraficoClientes(dados) {

        const elemento =
            document.getElementById(
                "graficoClientes"
            );

        if (!elemento) {
            return;
        }


        const lista =
            dados.graficos.clientes || [];


        // Mostra os 6 clientes mais frequentes
        const top =
            lista.slice(0, 6);


        graficos.clientes =
            new Chart(elemento, {

                type: "bar",

                data: {

                    labels:
                        top.map(
                            item => item.nome
                        ),

                    datasets: [{

                        label: "Atendimentos",

                        data:
                            top.map(
                                item => item.agendamentos
                            ),

                        backgroundColor:
                            "#C9A86A",

                        borderRadius: 8

                    }]

                },

                options: {

                    indexAxis: "y",

                    responsive: true,

                    maintainAspectRatio: false,

                    plugins: {

                        legend: {
                            display: false
                        },

                        tooltip: {

                            callbacks: {

                                label: function (context) {

                                    return (
                                        context.raw +
                                        " atendimentos"
                                    );

                                }

                            }

                        }

                    },

                    scales: {

                        x: {

                            beginAtZero: true,

                            ticks: {
                                precision: 0
                            },

                            grid: {
                                color: "#eeeeee"
                            }

                        },

                        y: {

                            grid: {
                                display: false
                            }

                        }

                    }

                }

            });

    }


    // ============================================================
    // 5. ATENDIMENTOS POR DIA
    // ============================================================

    function criarGraficoDias(dados) {

        const elemento =
            document.getElementById(
                "graficoDias"
            );

        if (!elemento) {
            return;
        }


        graficos.dias =
            new Chart(elemento, {

                type: "bar",

                data: {

                    labels:
                        dados.graficos.diasSemana.labels,

                    datasets: [{

                        label: "Atendimentos",

                        data:
                            dados.graficos.diasSemana.valores,

                        backgroundColor:
                            "#6B6E55",

                        borderRadius: 8

                    }]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    plugins: {

                        legend: {
                            display: false
                        },

                        tooltip: {

                            callbacks: {

                                label: function (context) {

                                    return (
                                        context.raw +
                                        " atendimentos"
                                    );

                                }

                            }

                        }

                    },

                    scales: {

                        y: {

                            beginAtZero: true,

                            ticks: {
                                precision: 0
                            },

                            grid: {
                                color: "#eeeeee"
                            }

                        },

                        x: {

                            grid: {
                                display: false
                            }

                        }

                    }

                }

            });

    }


    // ============================================================
    // 6. HORÁRIOS MAIS MOVIMENTADOS
    // ============================================================

    function criarGraficoHorarios(dados) {

        const elemento =
            document.getElementById(
                "graficoHorarios"
            );

        if (!elemento) {
            return;
        }


        graficos.horarios =
            new Chart(elemento, {

                type: "line",

                data: {

                    labels:
                        dados.graficos.horarios.labels,

                    datasets: [{

                        label: "Atendimentos",

                        data:
                            dados.graficos.horarios.valores,

                        borderColor:
                            "#6B6E55",

                        backgroundColor:
                            "rgba(107, 110, 85, 0.12)",

                        fill: true,

                        tension: 0.4,

                        pointRadius: 5,

                        pointHoverRadius: 7

                    }]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    plugins: {

                        legend: {
                            display: false
                        },

                        tooltip: {

                            callbacks: {

                                label: function (context) {

                                    return (
                                        context.raw +
                                        " atendimentos"
                                    );

                                }

                            }

                        }

                    },

                    scales: {

                        y: {

                            beginAtZero: true,

                            ticks: {
                                precision: 0
                            },

                            grid: {
                                color: "#eeeeee"
                            }

                        },

                        x: {

                            grid: {
                                display: false
                            }

                        }

                    }

                }

            });

    }


    // ============================================================
    // CARREGA RELATÓRIO
    // ============================================================

    async function carregarRelatorio(ano) {

        try {

            // Pequeno estado de carregamento
            document.body.classList.add(
                "carregando-relatorio"
            );


            const resposta =
                await fetch(
                    "api/rel_graficos.php?ano=" +
                    encodeURIComponent(ano)
                );


            if (!resposta.ok) {

                throw new Error(
                    "Erro HTTP " + resposta.status
                );

            }


            const dados =
                await resposta.json();


            if (dados.status !== "sucesso") {

                throw new Error(
                    dados.mensagem ||
                    "Não foi possível carregar o relatório."
                );

            }


            console.log(
                "Dados recebidos do Google Calendar:",
                dados
            );


            // ----------------------------------------------------
            // Atualiza interface
            // ----------------------------------------------------

            destruirGraficos();

            atualizarCards(dados);

            atualizarDestaques(dados);


            criarGraficoAtendimentos(dados);

            criarGraficoFaturamento(dados);

            criarGraficoProcedimentos(dados);

            criarGraficoClientes(dados);

            criarGraficoDias(dados);

            criarGraficoHorarios(dados);


        } catch (erro) {

            console.error(
                "Erro ao carregar relatório:",
                erro
            );


            Swal.fire({

                icon: "error",

                title: "Erro ao carregar relatório",

                text:
                    erro.message ||
                    "Não foi possível carregar os dados do Google Calendar."

            });

        } finally {

            document.body.classList.remove(
                "carregando-relatorio"
            );

        }

    }


    // ============================================================
    // TROCA DO ANO
    // ============================================================

    if (seletorAno) {

        seletorAno.addEventListener(
            "change",
            function () {

                const ano =
                    this.value;

                carregarRelatorio(ano);

            }
        );

    }


    // ============================================================
    // CARREGAMENTO INICIAL
    // ============================================================

    const anoInicial =
        seletorAno
            ? seletorAno.value
            : new Date().getFullYear();


    carregarRelatorio(anoInicial);


    // ============================================================
    // MENU MOBILE
    // ============================================================

    const menuToggle =
        document.getElementById("menuToggle");

    const sidebar =
        document.querySelector(".sidebar");

    const menuOverlay =
        document.getElementById("menuOverlay");


    if (
        menuToggle &&
        sidebar &&
        menuOverlay
    ) {

        menuToggle.addEventListener(
            "click",
            function () {

                sidebar.classList.toggle(
                    "open"
                );

                menuOverlay.classList.toggle(
                    "active"
                );

            }
        );


        menuOverlay.addEventListener(
            "click",
            function () {

                sidebar.classList.remove(
                    "open"
                );

                menuOverlay.classList.remove(
                    "active"
                );

            }
        );

    }

});