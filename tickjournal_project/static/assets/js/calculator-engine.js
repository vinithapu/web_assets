(function() {
    'use strict';

    // Config
    const config = {
        inputFields: JSON.parse(document.getElementById('input-fields-data')?.textContent || '[]'),
        outputFields: JSON.parse(document.getElementById('output-fields-data')?.textContent || '{}'),
        chartConfig: JSON.parse(document.getElementById('chart-config-data')?.textContent || '{}'),
        tableConfig: JSON.parse(document.getElementById('table-config-data')?.textContent || '{}'),
        calculationJs: JSON.parse(document.getElementById('calculation-js-data')?.textContent || '""')
    };

    // State
    const state = { outputs: {}, outputUnits: {}, chartData: null, tableData: [], tablePage: 1, chart: null };

    // Helpers
    const getFieldId = f => f.name || f.id;
    const getTodayStr = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); };
    const formatNumber = (n, d = 0) => typeof n === 'number' && !isNaN(n) ? n.toLocaleString('en-IN', { maximumFractionDigits: d }) : '--';

    function formatValue(v, fmt, opt = {}) {
        if (v == null) return '--';
        if (fmt !== 'string' && typeof v === 'string' && v.trim() && isNaN(Number(v.trim()))) return v.trim();
        const n = parseFloat(v);
        const dec = opt.decimals ?? 2;
        const needsSci = num => num !== 0 && (Math.abs(num) < Math.pow(10, -Math.max(dec, 4)) || Math.abs(num) >= 1e15);
        const toSci = num => String(parseFloat(num.toExponential(Math.min(dec, 4))));
        const smartFmt = num => isNaN(num) ? '--' : (needsSci(num) ? toSci(num) : formatNumber(num, dec));
        switch (fmt) {
            case 'currency': return isNaN(n) ? '--' : (opt.symbol_position === 'suffix' ? formatNumber(n, opt.decimals||0) + ' ' + (opt.currency_symbol||'₹') : (opt.currency_symbol||'₹') + formatNumber(n, opt.decimals||0));
            case 'percentage': return isNaN(n) ? '--' : n.toFixed(opt.decimals||2) + '%';
            case 'scientific': return isNaN(n) ? '--' : toSci(n);
            case 'string': return String(v);
            case 'number': case 'decimal': return smartFmt(n);
            case 'duration': if (isNaN(n)) return '--'; const y = Math.floor(n/12), m = n%12; return y && m ? `${y}y ${m}m` : y ? `${y} year${y>1?'s':''}` : `${m} month${m>1?'s':''}`;
            default: return !isNaN(n) && String(v).trim() !== '' ? smartFmt(n) : String(v);
        }
    }

    function formatSliderLabel(v, u) {
        if (!u) return formatNumber(v);
        if ('₹$€£'.includes(u)) { if (v >= 1e7) return u + (v/1e7) + 'Cr'; if (v >= 1e5) return u + (v/1e5) + 'L'; if (v >= 1e3) return u + (v/1e3) + 'K'; return u + v; }
        if (u === '%') return v + '%';
        if (u.toLowerCase().includes('year')) return v + (v === 1 ? ' Year' : ' Years');
        if (u.toLowerCase().includes('month')) return v + (v === 1 ? ' Month' : ' Months');
        return v + ' ' + u;
    }

    function getInputValue(id) {
        const radioChecked = document.querySelector(`input[type="radio"][name="${id}"]:checked`);
        if (radioChecked) return radioChecked.value;
        const el = document.getElementById(id);
        if (!el) return null;
        if (el.type === 'checkbox') return el.checked;
        return el.value;
    }

    function shouldShowField(f) {
        const cond = f.depends_on || f.show_if;
        if (!cond) return true;
        const v = getInputValue(cond.field);
        switch (cond.condition) {
            case 'equals': return v == cond.value;
            case 'not_equals': return v != cond.value;
            case 'greater': return parseFloat(v) > parseFloat(cond.value);
            case 'less': return parseFloat(v) < parseFloat(cond.value);
            case 'not_empty': return v !== '' && v != null;
            case 'empty': return v === '' || v == null;
            default: return v == cond.value;
        }
    }

    // Render Input Fields
    function renderInputFields() {
        const c = document.getElementById('inputFieldsContainer');
        if (!config.inputFields?.length) return;
        if (c.children.length === 0) c.innerHTML = config.inputFields.map(renderField).join('');
        bindFieldEvents();
        updateFieldVisibility();
    }

    function renderField(f) {
        const id = getFieldId(f), w = f.width || 'half';
        const wc = w === 'half' ? 'calc-field-half' : w === 'third' ? 'calc-field-third' : 'calc-field-full';
        let h = `<div class="field-group ${wc}" data-field-id="${id}">`;
        if (f.label && f.type !== 'checkbox') h += `<label for="${id}" class="cp-label">${f.label}${f.required ? ' <span class="cp-required">*</span>' : ''}</label>`;

        const u = f.unit || f.suffix || '', up = f.unit_position || 'suffix', hs = f.has_slider || f.hasSlider;

        switch (f.type) {
            case 'select':
                h += `<select id="${id}" class="cp-input">${f.placeholder ? `<option value="">${f.placeholder}</option>` : ''}${(f.options||[]).map(o => { const ov = typeof o === 'object' ? o.value : o, ol = typeof o === 'object' ? o.label : o, os = (typeof o === 'object' && o.selected) || f.default === ov; return `<option value="${ov}"${os?' selected':''}>${ol}</option>`; }).join('')}</select>`;
                break;
            case 'radio':
                h += `<div class="cp-radio-group">${(f.options||[]).map(o => { const ov = typeof o === 'object' ? o.value : o, ol = typeof o === 'object' ? o.label : o, oc = (typeof o === 'object' && o.selected) || f.default === ov; return `<label class="cp-pill-label"><input type="radio" name="${id}" value="${ov}"${oc?' checked':''} class="sr-only"><span>${ol}</span></label>`; }).join('')}</div>`;
                break;
            case 'checkbox':
                if (f.options?.length > 1) {
                    h += `<div class="cp-checkbox-group">${f.options.map(o => { const ov = typeof o === 'object' ? o.value : o, ol = typeof o === 'object' ? o.label : o, oc = typeof o === 'object' && o.selected; return `<label class="cp-pill-label"><input type="checkbox" name="${id}" value="${ov}"${oc?' checked':''} class="sr-only"><span>${ol}</span></label>`; }).join('')}</div>`;
                } else {
                    h += `<label class="cp-checkbox-single"><input type="checkbox" id="${id}" ${f.default?'checked':''}><span>${f.label}</span></label>`;
                }
                break;
            case 'textarea':
                h += `<textarea id="${id}" rows="${f.rows||3}" placeholder="${f.placeholder||''}" class="cp-input">${f.default||''}</textarea>`;
                break;
            case 'date': case 'datetime': case 'datetime-local': case 'time': case 'month': case 'week':
                const dt = f.type === 'datetime' ? 'datetime-local' : f.type;
                const dtDefault = f.default === 'today' ? getTodayStr() : (f.default || '');
                h += `<input type="${dt}" id="${id}" value="${dtDefault}" ${f.min?`min="${f.min}"`:''}${f.max?`max="${f.max}"`:''} class="cp-input">`;
                break;
            case 'range':
                h += `<div class="cp-range-wrap"><input type="range" id="${id}" min="${f.min||0}" max="${f.max||100}" step="${f.step||1}" value="${f.default||f.min||0}" class="cp-range"><span id="${id}_display" class="cp-range-val">${formatSliderLabel(f.default||f.min||0, u)}</span></div><div class="cp-range-labels"><span>${formatSliderLabel(f.min||0, u)}</span><span>${formatSliderLabel(f.max||100, u)}</span></div>`;
                break;
            case 'color':
                h += `<input type="color" id="${id}" value="${f.default||'#000000'}" class="cp-color-input">`;
                break;
            default:
                if (u) {
                    h += `<div class="cp-input-wrap">${u && up === 'prefix' ? `<span class="cp-addon cp-addon-prefix">${u}</span>` : ''}<input type="${f.type||'number'}" id="${id}" value="${f.default!==undefined?f.default:''}" placeholder="${f.placeholder||''}" ${f.min!==undefined?`min="${f.min}"`:''} ${f.max!==undefined?`max="${f.max}"`:''} ${f.step!==undefined?`step="${f.step}"`:''} ${f.required?'required':''} ${f.disabled?'disabled':''} ${f.pattern?`pattern="${f.pattern}"`:''} class="cp-input-bare">${u && up === 'suffix' ? `<span class="cp-addon cp-addon-suffix">${u}</span>` : ''}</div>`;
                } else {
                    h += `<input type="${f.type||'number'}" id="${id}" value="${f.default!==undefined?f.default:''}" placeholder="${f.placeholder||''}" ${f.min!==undefined?`min="${f.min}"`:''} ${f.max!==undefined?`max="${f.max}"`:''} ${f.step!==undefined?`step="${f.step}"`:''} ${f.required?'required':''} ${f.disabled?'disabled':''} ${f.pattern?`pattern="${f.pattern}"`:''} class="cp-input">`;
                }
                if (hs) h += `<input type="range" id="${id}_slider" min="${f.min||0}" max="${f.max||100}" step="${f.step||1}" value="${f.default||f.min||0}" class="cp-range" style="margin-top:8px;width:100%"><div class="cp-range-labels"><span>${formatSliderLabel(f.min||0, u)}</span><span>${formatSliderLabel(f.max||100, u)}</span></div>`;
        }

        if (f.help_text) h += `<p class="cp-help">${f.help_text}</p>`;
        return h + '</div>';
    }

    function bindFieldEvents() {
        config.inputFields.forEach(f => {
            const id = getFieldId(f), el = document.getElementById(id), sl = document.getElementById(id + '_slider');
            if (el) { el.addEventListener('input', handleChange); el.addEventListener('change', handleChange); }
            if (sl && el) { sl.addEventListener('input', () => { el.value = sl.value; handleChange(); }); el.addEventListener('input', () => { sl.value = el.value; }); }
            if (f.type === 'range') { const d = document.getElementById(id + '_display'); if (el && d) el.addEventListener('input', () => d.textContent = formatSliderLabel(el.value, f.unit||'')); }
            if (f.type === 'radio') document.querySelectorAll(`input[name="${id}"]`).forEach(r => r.addEventListener('change', handleChange));
            if (f.type === 'checkbox') document.querySelectorAll(`input[name="${id}"]`).forEach(c => c.addEventListener('change', handleChange));
        });
    }

    function handleChange() { updateFieldVisibility(); calculate(); }

    function updateFieldVisibility() {
        config.inputFields.forEach(f => {
            const c = document.querySelector(`[data-field-id="${getFieldId(f)}"]`);
            if (c) c.classList.toggle('field-hidden', !shouldShowField(f));
        });
    }

    // Render Outputs
    function renderOutputFields() {
        const o = config.outputFields;
        if (!o || !Object.keys(o).length) return;

        const arr = Array.isArray(o) ? o : (o.primary ? [o.primary, ...(o.secondary||[])] : []);
        if (arr.length) document.getElementById('primaryResultLabel').textContent = arr[0].label || 'Result';

        const sc = document.getElementById('secondaryResultsContainer');
        if (arr.length > 1) {
            sc.style.display = '';
            if (sc.children.length === 0) sc.innerHTML = arr.slice(1).map(f => `<div class="cp-result-card"><p class="cp-result-card-label">${f.label}</p><p id="output_${getFieldId(f)}" class="cp-result-card-value ${f.color?'cp-color-'+f.color:''}">--</p></div>`).join('');
        } else sc.style.display = 'none';
    }

    // Calculation
    function setOutput(n, v) { state.outputs[n] = v; }
    function setUnit(n, u) { state.outputUnits[n] = u; }
    function setChartData(d) { state.chartData = d; }
    function setTableData(r) { state.tableData = r; state.tablePage = 1; }

    function calculate() {
        try {
            state.outputs = {}; state.outputUnits = {}; state.chartData = null; state.tableData = [];

            const inputs = {};
            config.inputFields.forEach(f => {
                const id = getFieldId(f);

                if (f.type === 'radio') {
                    const c = document.querySelector(`input[name="${id}"]:checked`);
                    inputs[id] = c ? c.value : null;
                    return;
                }

                if (f.type === 'checkbox' && f.options?.length > 1) {
                    inputs[id] = Array.from(document.querySelectorAll(`input[name="${id}"]:checked`)).map(c => c.value);
                    return;
                }

                const el = document.getElementById(id);
                if (!el) return;

                if (f.type === 'checkbox') {
                    inputs[id] = el.checked;
                } else if (['number', 'range'].includes(f.type) || !f.type) {
                    inputs[id] = parseFloat(el.value) || 0;
                } else {
                    inputs[id] = el.value;
                }
            });

            if (config.calculationJs?.trim()) {
                const fn = new Function('inputs', 'setOutput', 'setChartData', 'setTableData', 'formatNumber', 'formatValue', 'setUnit', config.calculationJs);
                fn(inputs, setOutput, setChartData, setTableData, formatNumber, formatValue, setUnit);
            }

            updateOutputDisplay();
            updateChart();
            updateTable();
        } catch (e) { console.error('Calculation error:', e); }
    }

    function getUnit(f) {
        const fid = getFieldId(f);
        return state.outputUnits[fid] || (f.unit || f.suffix || '').trim();
    }

    function updateOutputDisplay() {
        const arr = Array.isArray(config.outputFields) ? config.outputFields : (config.outputFields?.primary ? [config.outputFields.primary, ...(config.outputFields.secondary||[])] : []);
        if (!arr.length) return;

        const pf = arr[0], pid = getFieldId(pf);
        if (state.outputs[pid] !== undefined) {
            const val = formatValue(state.outputs[pid], pf.format, pf), unit = getUnit(pf);
            document.getElementById('primaryResultValue').textContent = unit ? val + ' ' + unit : val;
        }

        arr.slice(1).forEach(f => {
            const fid = getFieldId(f), el = document.getElementById('output_' + fid);
            if (el && state.outputs[fid] !== undefined) {
                const val = formatValue(state.outputs[fid], f.format, f), unit = getUnit(f);
                el.textContent = unit ? val + ' ' + unit : val;
            }
        });
    }

    function updateChart() {
        const cc = document.getElementById('chartContainer'), cfg = config.chartConfig;
        if (!cfg?.enabled || !state.chartData) { cc.style.display = 'none'; return; }
        cc.style.display = '';
        document.getElementById('chartTitle').textContent = cfg.title || 'Chart';

        if (state.chart) { state.chart.destroy(); state.chart = null; }

        const ctx = document.getElementById('resultChart').getContext('2d');
        const colors = cfg.colors || ['#5CC6FF', '#FF6B6B', '#85FFC4', '#FFD93D', '#B794F4'];
        const type = cfg.type === 'donut' ? 'doughnut' : (cfg.type || 'doughnut');

        let labels, values;
        if (Array.isArray(state.chartData)) {
            labels = state.chartData.map(d => d.label);
            values = state.chartData.map(d => d.value);
        } else {
            labels = state.chartData.labels || [];
            values = state.chartData.values || [];
        }

        state.chart = new Chart(ctx, {
            type,
            data: { labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: ['line','area'].includes(type) ? 2 : 0, fill: type === 'area' }] },
            options: { responsive: false, maintainAspectRatio: true, plugins: { legend: { display: false } }, cutout: ['doughnut','donut'].includes(type) ? '60%' : undefined }
        });

        document.getElementById('chartLegend').innerHTML = labels.map((l, i) => `<div style="display:flex;align-items:center;gap:10px"><div style="width:14px;height:14px;border-radius:4px;background:${colors[i%colors.length]};flex-shrink:0"></div><div><p style="font-size:12px;color:#718096;margin:0">${l}</p><p style="font-size:13px;font-weight:700;color:#e2e8f0;margin:0">${formatNumber(values[i])}</p></div></div>`).join('');
    }

    function updateTable() {
        const tc = document.getElementById('tableContainer'), cfg = config.tableConfig;
        if (!cfg?.enabled || !state.tableData?.length) { tc.style.display = 'none'; return; }
        tc.style.display = '';
        document.getElementById('tableTitle').textContent = cfg.title || 'Results';

        const cols = cfg.columns || [];
        document.getElementById('tableHead').innerHTML = `<tr>${cols.map(c => `<th>${c.label}</th>`).join('')}</tr>`;

        const rpp = cfg.rows_per_page || (cfg.paginate ? 12 : state.tableData.length);
        const tp = Math.ceil(state.tableData.length / rpp);
        const si = (state.tablePage - 1) * rpp, ei = Math.min(si + rpp, state.tableData.length);

        document.getElementById('tableBody').innerHTML = state.tableData.slice(si, ei).map(r => `<tr>${cols.map(c => `<td>${formatValue(r[c.key], c.format, c)}</td>`).join('')}</tr>`).join('');

        const pg = document.getElementById('tablePagination');
        if (cfg.paginate && tp > 1) {
            pg.style.display = '';
            document.getElementById('tableInfo').textContent = `Showing ${si+1}–${ei} of ${state.tableData.length}`;
            document.getElementById('tablePrevBtn').disabled = state.tablePage <= 1;
            document.getElementById('tableNextBtn').disabled = state.tablePage >= tp;
        } else pg.style.display = 'none';
    }

    // Actions
    document.getElementById('resetBtn').addEventListener('click', () => {
        config.inputFields.forEach(f => {
            const id = getFieldId(f), el = document.getElementById(id), sl = document.getElementById(id + '_slider');
            if (el) el.type === 'checkbox' ? el.checked = !!f.default : el.value = f.default ?? '';
            if (sl) sl.value = f.default ?? f.min ?? 0;
            if (f.type === 'radio' && f.default) { const r = document.querySelector(`input[name="${id}"][value="${f.default}"]`); if (r) r.checked = true; }
        });
        updateFieldVisibility(); calculate();
    });

    document.getElementById('copyBtn').addEventListener('click', () => {
        let t = document.querySelector('h1').textContent + ' Results\n' + '═'.repeat(40) + '\n\nINPUTS:\n';
        config.inputFields.forEach(f => { if (!shouldShowField(f)) return; const id = getFieldId(f), v = getInputValue(id), u = f.unit || ''; t += `• ${f.label}: ${v}${u ? ' ' + u : ''}\n`; });
        t += '\nRESULTS:\n• ' + document.getElementById('primaryResultLabel').textContent + ': ' + document.getElementById('primaryResultValue').textContent + '\n';
        document.querySelectorAll('#secondaryResultsContainer .cp-result-card').forEach(d => { const l = d.querySelector('.cp-result-card-label')?.textContent, v = d.querySelector('.cp-result-card-value')?.textContent; if (l && v) t += `• ${l}: ${v}\n`; });
        t += '\n' + '═'.repeat(40) + '\nCalculated at Tickjournal.com';
        navigator.clipboard.writeText(t).then(() => { const s = document.querySelector('#copyBtn span'); s.textContent = 'Copied!'; setTimeout(() => s.textContent = 'Copy Results', 2000); });
    });

    document.getElementById('shareBtn').addEventListener('click', () => {
        const title = document.querySelector('h1').textContent + ' - Tickjournal.com', text = document.getElementById('primaryResultLabel').textContent + ': ' + document.getElementById('primaryResultValue').textContent;
        if (navigator.share) navigator.share({ title, text, url: location.href });
        else navigator.clipboard.writeText(location.href).then(() => { const s = document.querySelector('#shareBtn span'); s.textContent = 'Link Copied!'; setTimeout(() => s.textContent = 'Share', 2000); });
    });

    document.getElementById('tablePrevBtn')?.addEventListener('click', () => { if (state.tablePage > 1) { state.tablePage--; updateTable(); } });
    document.getElementById('tableNextBtn')?.addEventListener('click', () => { const rpp = config.tableConfig?.rows_per_page || 12, tp = Math.ceil(state.tableData.length / rpp); if (state.tablePage < tp) { state.tablePage++; updateTable(); } });
    document.getElementById('exportTableBtn')?.addEventListener('click', () => {
        if (!state.tableData?.length) return;
        const cols = config.tableConfig?.columns || [];
        let csv = cols.map(c => c.label).join(',') + '\n';
        state.tableData.forEach(r => csv += cols.map(c => r[c.key]).join(',') + '\n');
        const slug = document.querySelector('[data-tool-slug]')?.dataset.toolSlug || 'calculator';
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = slug + '-results.csv'; a.click();
    });

    function init() {
        renderInputFields();
        renderOutputFields();
        config.inputFields.forEach(f => {
            if (['date','datetime','datetime-local'].includes(f.type) && f.default === 'today') {
                const el = document.getElementById(getFieldId(f));
                if (el && !el.value) el.value = getTodayStr();
            }
        });
        calculate();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.calculatorReinit = function (toolConfig) {
        // Accept camelCase (main tool) or snake_case (companion JSON)
        config.inputFields  = toolConfig.inputFields  || toolConfig.input_fields   || [];
        config.outputFields = toolConfig.outputFields || toolConfig.output_fields  || {};
        config.chartConfig  = toolConfig.chartConfig  || toolConfig.chart_config   || {};
        config.tableConfig  = toolConfig.tableConfig  || toolConfig.table_config   || {};
        config.calculationJs = toolConfig.calculationJs || toolConfig.calculation_js || '';

        state.outputs = {}; state.outputUnits = {}; state.chartData = null; state.tableData = []; state.tablePage = 1;
        if (state.chart) { state.chart.destroy(); state.chart = null; }

        document.getElementById('inputFieldsContainer').innerHTML = '';
        document.getElementById('secondaryResultsContainer').innerHTML = '';

        renderInputFields();
        renderOutputFields();
        calculate();
    };
})();
