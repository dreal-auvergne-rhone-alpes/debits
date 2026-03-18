let myChart = null;

const deptSelector = document.getElementById('deptSelector');
const stationSelector = document.getElementById('stationSelector');

// 1. Charger les stations quand le département change
deptSelector.addEventListener('change', function() {
    const codeDept = this.value;
    if (!codeDept) return;

    stationSelector.disabled = true;
    stationSelector.innerHTML = '<option>Chargement...</option>';

    // API pour lister les sites temps réel d'un département
    const urlStations = `https://hubeau.eaufrance.fr/api/v2/hydrometrie/referentiel/sites?code_departement=${codeDept}&format=json&size=200`;

    fetch(urlStations)
        .then(r => r.json())
        .then(json => {
            stationSelector.innerHTML = '<option value="">Choisir une station</option>';
            // On trie par nom alphabétique
            const stations = json.data.sort((a, b) => a.libelle_site.localeCompare(b.libelle_site));
            
            stations.forEach(s => {
                let opt = document.createElement('option');
                opt.value = s.code_site;
                opt.text = `${s.libelle_site} (${s.code_site})`;
                stationSelector.appendChild(opt);
            });
            stationSelector.disabled = false;
        });
});

// 2. Charger les données quand la station change
stationSelector.addEventListener('change', function() {
    const codeSite = this.value;
    if (!codeSite) return;
    
    const labelSite = this.options[this.selectedIndex].text;
    document.getElementById('stationTitle').innerText = labelSite;
    updateData(codeSite);
});

function updateData(codeSite) {
    const NB_JOURS = 7;
    const maintenant = Date.now();
    const limiteTemps = maintenant - NB_JOURS * 24 * 3600 * 1000;

    // URL Live
    const URL_LIVE = `https://hubeau.eaufrance.fr/api/v2/hydrometrie/observations_tr?code_entite=${codeSite}&grandeur_hydro=Q&sort=DESC&size=1`;
    
    // URL Graphique
    const URL_GRAPH = `https://hubeau.eaufrance.fr/api/v2/hydrometrie/observations_tr?code_entite=${codeSite}&grandeur_hydro=Q&sort=DESC&size=2000`;

    // Fetch Temps Réel
    fetch(URL_LIVE).then(r => r.json()).then(json => {
        if (json.data && json.data.length > 0) {
            const obs = json.data[0];
            const q_ls = Number(obs.resultat_obs);
            document.getElementById("debit").innerText = q_ls >= 1000 ? (q_ls/1000).toFixed(3) + " m³/s" : Math.round(q_ls) + " l/s";
            document.getElementById("date").innerText = "Dernière mesure : " + new Date(obs.date_obs).toLocaleString("fr-FR");
        } else {
            document.getElementById("debit").innerText = "Pas de données";
        }
    });

    // Fetch Graphique
    fetch(URL_GRAPH).then(r => r.json()).then(json => {
        if (!json.data || json.data.length === 0) return;

        const data = json.data
            .filter(d => new Date(d.date_obs).getTime() >= limiteTemps)
            .sort((a, b) => new Date(a.date_obs) - new Date(b.date_obs));

        const labels = data.map(d => new Date(d.date_obs).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit" }));
        const serie = data.map(d => Number(d.resultat_obs) / 1000);

        if (myChart) myChart.destroy(); // Détruire l'ancien graph pour éviter les superpositions

        const ctx = document.getElementById("graph").getContext("2d");
        myChart = new Chart(ctx, {
            type: "line",
            data: {
                labels,
                datasets: [{
                    label: "Débit (m³/s)",
                    data: serie,
                    borderColor: "#007bff",
                    backgroundColor: "rgba(0, 123, 255, 0.1)",
                    fill: true,
                    tension: 0.3,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: false }
                }
            }
        });
    });
}