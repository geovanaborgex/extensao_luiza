document.addEventListener("DOMContentLoaded", function () {

    // =========================
    // DADOS DE EXEMPLO - 2026
    // =========================

    const meses = [
        "Janeiro", "Fevereiro", "Março", "Abril",
        "Maio", "Junho", "Julho", "Agosto",
        "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    const atendimentosPorMes = [
        180, 220, 250, 210, 280, 240,
        260, 290, 230, 300, 280, 330
    ];

    const faturamentoPorMes = [
        7200, 8500, 9800, 8100, 11200, 9400,
        10300, 11800, 9100, 12500, 11200, 14800
    ];

    const procedimentos = [
        "Escova",
        "Corte",
        "Manicure",
        "Pedicure",
        "Hidratação",
        "Design de Sobrancelha"
    ];

    const quantidadeProcedimentos = [
        300, 245, 220, 190, 165, 140
    ];

    const clientes = [
        "Geovana",
        "Ana Clara",
        "Maria",
        "Juliana",
        "Larissa",
        "Camila"
    ];

    const atendimentosClientes = [
        28, 25, 23, 21, 19, 17
    ];

    const diasSemana = [
        "Domingo",
        "Segunda",
        "Terça",
        "Quarta",
        "Quinta",
        "Sexta",
        "Sábado"
    ];

    const atendimentosPorDia = [
        80, 150, 175, 190, 210, 230, 210
    ];

    const horarios = [
        "08h",
        "09h",
        "10h",
        "11h",
        "12h",
        "13h",
        "14h",
        "15h",
        "16h",
        "17h",
        "18h"
    ];

    const atendimentosPorHorario = [
        35, 60, 85, 100, 55, 40,
        95, 120, 135, 110, 80
    ];


    // =========================
    // CONFIGURAÇÃO PADRÃO
    // =========================

    Chart.defaults.font.family = "Poppins";
    Chart.defaults.font.size = 12;

    Chart.defaults.plugins.legend.labels.usePointStyle = true;


    // =========================
    // 1. ATENDIMENTOS POR MÊS
    // =========================

    const elementoAtendimentos = document.getElementById("graficoAtendimentos");

    if (elementoAtendimentos) {

        new Chart(elementoAtendimentos, {
            type: "bar",

            data: {
                labels: meses,

                datasets: [{
                    label: "Atendimentos",
                    data: atendimentosPorMes,

                    borderRadius: 8,

                    backgroundColor: "#6B6E55",

                    hoverBackgroundColor: "#575945"
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
                                return context.raw + " atendimentos";
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


    // =========================
    // 2. FATURAMENTO POR MÊS
    // =========================

    const elementoFaturamento = document.getElementById("graficoFaturamento");

    if (elementoFaturamento) {

        new Chart(elementoFaturamento, {
            type: "line",

            data: {
                labels: meses,

                datasets: [{
                    label: "Faturamento",

                    data: faturamentoPorMes,

                    borderColor: "#C9A86A",

                    backgroundColor: "rgba(201, 168, 106, 0.12)",

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

                                return "R$ " +
                                    context.raw.toLocaleString("pt-BR", {
                                        minimumFractionDigits: 2
                                    });
                            }
                        }
                    }
                },

                scales: {

                    y: {
                        beginAtZero: true,

                        ticks: {
                            callback: function (value) {
                                return "R$ " + value.toLocaleString("pt-BR");
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


    // =========================
    // 3. PROCEDIMENTOS MAIS REALIZADOS
    // =========================

    const elementoProcedimentos =
        document.getElementById("graficoProcedimentos");

    if (elementoProcedimentos) {

        new Chart(elementoProcedimentos, {

            type: "bar",

            data: {

                labels: procedimentos,

                datasets: [{
                    label: "Quantidade",

                    data: quantidadeProcedimentos,

                    backgroundColor: "#6B6E55",

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

                                return context.raw + " atendimentos";
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


    // =========================
    // 4. CLIENTES MAIS FREQUENTES
    // =========================

    const elementoClientes =
        document.getElementById("graficoClientes");

    if (elementoClientes) {

        new Chart(elementoClientes, {

            type: "bar",

            data: {

                labels: clientes,

                datasets: [{

                    label: "Atendimentos",

                    data: atendimentosClientes,

                    backgroundColor: "#C9A86A",

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

                                return context.raw + " atendimentos";
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


    // =========================
    // 5. ATENDIMENTOS POR DIA
    // =========================

    const elementoDias =
        document.getElementById("graficoDias");

    if (elementoDias) {

        new Chart(elementoDias, {

            type: "bar",

            data: {

                labels: diasSemana,

                datasets: [{

                    label: "Atendimentos",

                    data: atendimentosPorDia,

                    backgroundColor: "#6B6E55",

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

                                return context.raw + " atendimentos";
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


    // =========================
    // 6. HORÁRIOS MAIS MOVIMENTADOS
    // =========================

    const elementoHorarios =
        document.getElementById("graficoHorarios");

    if (elementoHorarios) {

        new Chart(elementoHorarios, {

            type: "line",

            data: {

                labels: horarios,

                datasets: [{

                    label: "Atendimentos",

                    data: atendimentosPorHorario,

                    borderColor: "#6B6E55",

                    backgroundColor: "rgba(107, 110, 85, 0.12)",

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

                                return context.raw + " atendimentos";
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


    // =========================
    // TROCA DO ANO
    // =========================

    const seletorAno =
        document.getElementById("anoRelatorio");

    if (seletorAno) {

        seletorAno.addEventListener("change", function () {

            const ano = this.value;

            console.log("Ano selecionado:", ano);

        });
    }

});


/* ============================================================
   ABRIR MENU TOGGLE
============================================================ */

const menuToggle=document.getElementById("menuToggle");
const sidebar=document.querySelector(".sidebar");
const menuOverlay=document.getElementById("menuOverlay");

menuToggle.addEventListener("click",()=>{
  sidebar.classList.toggle("open");
  menuOverlay.classList.toggle("active");
});

menuOverlay.addEventListener("click",()=>{
  sidebar.classList.remove("open");
  menuOverlay.classList.remove("active");
});
