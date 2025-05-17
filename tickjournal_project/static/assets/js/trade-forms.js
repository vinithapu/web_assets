// Use novalidate on the form when loading
window.setupTradeForm = function() {
    const form = document.getElementById('tradeForm');
    if (form) {
        // Add novalidate attribute to bypass browser validation
        form.setAttribute('novalidate', 'novalidate');
        console.log("Form novalidate set");
    }
};

// Explicitly rename this function to avoid conflicts
window.addTradeEntry = function(isMobile) {
    console.log("Adding trade entry, mobile:", isMobile);

    const form = document.getElementById('tradeForm');
    if (!form) {
        console.error("Form not found");
        return;
    }

    // Different container and template ids for desktop vs mobile
    let container, template;

    if (isMobile) {
        // Mobile view
        container = document.querySelector('#mobileTradeEntries');
        template = document.querySelector('#mobileTradeEntries .pop-up-resposive[data-entry-template="true"]');
    } else {
        // Desktop view
        container = document.querySelector('#editTradeEntries');
        template = document.querySelector('#editTradeEntries .trade-entry[data-entry-template="true"]');
    }

    if (!container || !template) {
        console.error('Could not find container or template', isMobile ? 'mobile' : 'desktop');
        return;
    }

    // Get current visible entries count for the CORRECT VIEW
    const entriesSelector = isMobile ?
        '#mobileTradeEntries .pop-up-resposive:not([style*="display: none"]):not([data-entry-template="true"])' :
        '#editTradeEntries .trade-entry:not([style*="display: none"]):not([data-entry-template="true"])';

    const entriesCount = document.querySelectorAll(entriesSelector).length;
    console.log(`Current ${isMobile ? 'mobile' : 'desktop'} entries count:`, entriesCount);

    // Clone the template
    const newEntry = template.cloneNode(true);
    newEntry.removeAttribute('data-entry-template');
    newEntry.style.display = '';

    // Update input names with correct view prefix and index
    const viewPrefix = isMobile ? 'mobile' : 'desktop';

    newEntry.querySelectorAll('input').forEach(input => {
        // Replace 'template' with the correct view-prefixed entries array
        const newName = input.name
            .replace('template', `${viewPrefix}_entries[${entriesCount}]`);
        input.name = newName;

        // Enable all inputs
        input.disabled = false;

        // Only make non-hidden inputs required
        if (input.type !== 'hidden') {
            input.required = true;

            // Set default values based on input type
            if (input.type === 'datetime-local') {
                const now = new Date();
                input.value = now.toISOString().slice(0, 16);
            } else if (input.type === 'number') {
                if (input.name.includes('[quantity]')) {
                    input.value = '1';
                } else {
                    input.value = '0';
                }
            }
        }
    });

    // Append to container
    container.appendChild(newEntry);
    console.log(`Added new entry #${entriesCount} to ${isMobile ? 'mobile' : 'desktop'} view`);
};

window.toggleTradeAction = function(element) {
    const isMobile = element.classList.contains('res-btn');

    if (isMobile) {
        // Mobile button
        const input = element.querySelector('input[type="hidden"]');
        if (!input) return;

        const currentAction = input.value;
        const newAction = currentAction === 'BUY' ? 'SELL' : 'BUY';

        // Update hidden input
        input.value = newAction;

        // Update button text
        const oldContent = element.textContent;
        element.textContent = newAction;

        // Reattach the input that was removed when setting textContent
        element.appendChild(input);

        // Update color
        element.style.backgroundColor = newAction === 'BUY' ? '#52CA96' : '#FF5993';
    } else {
        // Desktop div
        const h1 = element.querySelector('h1');
        const input = element.querySelector('input[type="hidden"]');
        if (!h1 || !input) return;

        const currentAction = input.value;
        const newAction = currentAction === 'BUY' ? 'SELL' : 'BUY';

        // Update text and input
        h1.textContent = newAction;
        input.value = newAction;

        // Update color
        element.style.backgroundColor = newAction === 'BUY' ? '#52CA96' : '#FF5993';
    }
};

window.deleteEntry = function(element) {
    if (!confirm('Are you sure you want to delete this entry?')) return;

    // Find the entry element (row or div)
    const entry = element.closest('.trade-entry, .pop-up-resposive');
    if (!entry) return;

    const entryId = entry.dataset.entryId;

    if (entryId) {
        // This is an existing entry - delete via API
        const form = document.getElementById('tradeForm');
        const tradeId = form.querySelector('input[name="trade_id"]')?.value;

        if (!tradeId) {
            console.error('No trade ID found');
            return;
        }

        fetch(`/api/trades/${tradeId}/delete_entry/`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': form.querySelector('[name="csrfmiddlewaretoken"]').value,
                'Authorization': `Token ${window.authToken}`
            },
            body: JSON.stringify({ entry_id: entryId })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to delete entry');
            }
            // Remove from DOM
            entry.remove();
            window.reindexEntries();
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Failed to delete entry. Please try again.');
        });
    } else {
        // New entry - just remove from DOM
        entry.remove();
        window.reindexEntries();
    }
};

window.reindexEntries = function() {
    // Reindex desktop entries
    const desktopEntries = document.querySelectorAll('#editTradeEntries .trade-entry:not([style*="display: none"]):not([data-entry-template="true"])');
    desktopEntries.forEach((entry, index) => {
        entry.querySelectorAll('input').forEach(input => {
            const name = input.name;
            if (name) {
                // Replace current index with new index
                const newName = name.replace(/desktop_entries\[\d+\]/, `desktop_entries[${index}]`);
                input.name = newName;
            }
        });
    });

    // Reindex mobile entries
    const mobileEntries = document.querySelectorAll('#mobileTradeEntries .pop-up-resposive:not([style*="display: none"]):not([data-entry-template="true"])');
    mobileEntries.forEach((entry, index) => {
        entry.querySelectorAll('input').forEach(input => {
            const name = input.name;
            if (name) {
                // Replace current index with new index
                const newName = name.replace(/mobile_entries\[\d+\]/, `mobile_entries[${index}]`);
                input.name = newName;
            }
        });
    });
};

window.deleteTrade = function() {
    if (!confirm('Are you sure you want to delete this entire trade?')) return;

    const form = document.getElementById('tradeForm');
    const tradeId = form.querySelector('input[name="trade_id"]')?.value;

    if (!tradeId) {
        console.error('No trade ID found');
        return;
    }

    fetch(`/api/trades/${tradeId}/`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Token ${window.authToken}`,
            'X-CSRFToken': form.querySelector('[name="csrfmiddlewaretoken"]').value
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to delete trade');
        }
        window.location.href = '/dashboard/';
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Failed to delete trade. Please try again.');
    });
};

window.handleFormSubmit = function(event) {
    event.preventDefault();
    const form = event.target;

    // Get basic trade data
    const tradeId = form.querySelector('input[name="trade_id"]')?.value;
    const isNew = !tradeId;

    // Determine if we're using desktop or mobile based on screen width
    const useDesktop = window.innerWidth >= 769;
    console.log("Using desktop view:", useDesktop);

    // Create the data object that will be sent to the API
    const formData = {
        symbol: form.querySelector('[name="symbol"]').value,
        market: form.querySelector('[name="market"]').value,
        target_price: parseFloat(form.querySelector('[name="target_price"]').value) || 0,
        stop_loss: parseFloat(form.querySelector('[name="stop_loss"]').value) || 0,
        entries: []
    };

    // Get entries from the ACTIVE view only
    const prefix = useDesktop ? 'desktop' : 'mobile';
    const entriesSelector = useDesktop ?
        '#editTradeEntries .trade-entry:not([style*="display: none"]):not([data-entry-template="true"])' :
        '#mobileTradeEntries .pop-up-resposive:not([style*="display: none"]):not([data-entry-template="true"])';

    const entries = form.querySelectorAll(entriesSelector);

    // Process each entry from the ACTIVE view only
    entries.forEach((entry) => {
        // Find inputs by specific attribute patterns to avoid cross-view conflicts
        const prefixPattern = `[name^="${prefix}_entries"][name$="[date]"]`;
        const dateInput = entry.querySelector(prefixPattern) || entry.querySelector('[name*="[date]"]');

        if (!dateInput) {
            console.error("Could not find date input in entry", entry);
            return;
        }

        // Extract index from the date input name
        const nameMatch = dateInput.name.match(/\[(\d+)\]/);
        if (!nameMatch) {
            console.error("Could not extract index from input name", dateInput.name);
            return;
        }

        const index = nameMatch[1];

        // Get all other inputs using the same index pattern
        const quantityInput = entry.querySelector(`[name$="[${index}][quantity]"]`);
        const priceInput = entry.querySelector(`[name$="[${index}][price]"]`);
        const feesInput = entry.querySelector(`[name$="[${index}][fees]"]`);
        const actionInput = entry.querySelector(`[name$="[${index}][action]"]`);

        if (!dateInput || !quantityInput || !priceInput || !feesInput || !actionInput) {
            console.error("Missing required input in entry", index);
            return;
        }

        const entryData = {
            date: dateInput.value,
            quantity: parseFloat(quantityInput.value) || 1,
            price: parseFloat(priceInput.value) || 0,
            fees: parseFloat(feesInput.value) || 0,
            action: actionInput.value
        };

        // If existing entry, include ID
        if (entry.dataset.entryId) {
            entryData.id = parseInt(entry.dataset.entryId);
        }

        formData.entries.push(entryData);
    });

    console.log("Submitting form data:", formData);

    // API endpoint and method
    const apiUrl = isNew ? '/api/trades/' : `/api/trades/${tradeId}/`;
    const method = isNew ? 'POST' : 'PUT';

    // Submit to API
    fetch(apiUrl, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': form.querySelector('[name="csrfmiddlewaretoken"]').value,
            'Authorization': `Token ${window.authToken}`
        },
        body: JSON.stringify(formData)
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(error => {
                throw new Error(JSON.stringify(error));
            });
        }
        return response.json();
    })
    .then(() => {
        // Success! Refresh dashboard
        window.location.href = '/dashboard/';
    })
    .catch(error => {
        console.error('Error:', error);
        let errorMessage = 'Failed to save trade. Please try again.';
        try {
            const errorObj = JSON.parse(error.message);
            errorMessage = Object.entries(errorObj)
                .map(([key, value]) => `${key}: ${value}`)
                .join('\n');
        } catch (e) {
            errorMessage = error.message;
        }
        alert(errorMessage);
    });

    return false;
};

// Initialize date pickers
window.initializeDateTimePickers = function() {
    console.log("Date pickers initialized");
    // Apply novalidate to form to prevent browser validation
    window.setupTradeForm();
};

// Initialize modal scripts
window.initializeModalScripts = function() {
    console.log("Modal scripts initialized");
    // Apply novalidate to form to prevent browser validation
    window.setupTradeForm();
};

// Close modal function
window.closeModal = function() {
    const modalContainer = document.getElementById('modal-container');
    if (modalContainer) {
        modalContainer.innerHTML = '';
    }
};

// Call setup when script loads
document.addEventListener('DOMContentLoaded', function() {
    // This will apply to any forms already in the page
    window.setupTradeForm();
});