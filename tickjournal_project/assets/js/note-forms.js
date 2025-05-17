// Functions for note form handling
document.addEventListener('DOMContentLoaded', function() {
    // Set up global event listener for New Note button in sidebar
    document.addEventListener('click', function(event) {
        if (event.target.closest('.new-trades a[href="#newnote"]')) {
            event.preventDefault();
            loadNewNoteModal();
        }
    });
});

// Function to load note modal
function loadNoteModal(noteId) {
    let url = noteId ? `/notes/${noteId}/form/` : '/notes/form/';
    fetch(url, {
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => response.text())
    .then(html => {
        const modalContainer = document.getElementById('modal-container');
        modalContainer.innerHTML = html;
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Failed to load note form. Please try again.');
    });
}

// Add a function for the new note button
function loadNewNoteModal() {
    loadNoteModal();
}

// Replace this function in note-forms.js
window.handleNoteFormSubmit = function(event) {
    event.preventDefault();
    console.log("Note form submission intercepted");

    // Get form regardless of how the event was triggered
    const form = event.target.tagName === 'FORM' ? event.target : document.getElementById('noteForm');

    if (!form) {
        console.error("Form element not found");
        alert("Error: Cannot find the form element");
        return false;
    }

    // Get basic note data
    const noteId = form.querySelector('input[name="note_id"]')?.value;
    const isNew = !noteId;

    // Make sure editor exists before trying to access it
    const editor = document.getElementById('editor');
    const notesField = document.getElementById('notes-field');

    if (editor && notesField) {
        // Update hidden notes field with editor content
        notesField.value = editor.innerHTML;
    } else {
        console.warn("Editor or notes field not found");
    }

    // Create the data object that will be sent to the API
    const formData = {
        date: form.querySelector('[name="date"]')?.value || new Date().toISOString().split('T')[0],
        summary: form.querySelector('[name="summary"]')?.value || '',
        notes: notesField?.value || '',
        mood: document.getElementById('mood-field')?.value || 'NEUTRAL',
        market_condition: document.getElementById('market-field')?.value || 'SIDEWAYS',
        volatility: document.getElementById('volatility-field')?.value || 'MEDIUM'
    };

    console.log("Submitting note data:", formData);

    // API endpoint and method
    const apiUrl = isNew ? '/api/notes/' : `/api/notes/${noteId}/`;
    const method = isNew ? 'POST' : 'PUT';
    const csrfToken = form.querySelector('[name="csrfmiddlewaretoken"]')?.value;

    if (!csrfToken) {
        console.error("CSRF token not found");
        alert("Error: CSRF token is missing");
        return false;
    }

    console.log(`Sending ${method} request to ${apiUrl}`);

    // Submit to API
    fetch(apiUrl, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken,
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(formData)
    })
    .then(response => {
        console.log("Response status:", response.status);
        if (!response.ok) {
            return response.json().then(error => {
                throw new Error(JSON.stringify(error));
            });
        }
        return response.json();
    })
    .then(data => {
        console.log("Success! Note saved:", data);
        // Redirect to dashboard
        window.location.href = '/dashboard/';
    })
    .catch(error => {
        console.error('Error:', error);
        let errorMessage = 'Failed to save note. Please try again.';
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

// Delete note function
window.deleteNote = function() {
    if (!confirm('Are you sure you want to delete this note?')) {
        return;
    }

    const form = document.getElementById('noteForm');
    const formData = new FormData(form);
    const noteId = formData.get('note_id');

    if (!noteId) {
        return;
    }

    fetch(`/api/notes/${noteId}/`, {
        method: 'DELETE',
        headers: {
            'X-CSRFToken': formData.get('csrfmiddlewaretoken')
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        // Close modal and redirect
        window.closeModal();
        window.location.href = '/dashboard/';
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Failed to delete note. Please try again.');
    });
};

// Initialize mood/market/volatility buttons when modal loads
function initializeNoteForm() {
    console.log("Initializing note form elements");

    // Toggle button functionality
    document.querySelectorAll('.mood-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            document.getElementById('mood-field').value = this.dataset.value;
        });
    });

    document.querySelectorAll('.market-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.market-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            document.getElementById('market-field').value = this.dataset.value;
        });
    });

    document.querySelectorAll('.volatility-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.volatility-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            document.getElementById('volatility-field').value = this.dataset.value;
        });
    });

    // Add backup click handler to save button
// Replace this part in the initializeNoteForm function
setTimeout(function() {
    const saveBtn = document.querySelector('#noteForm .save-btn');
    if (saveBtn) {
        console.log("Adding backup click handler to save button");
        saveBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log("Save button clicked directly");

            // Get the form directly instead of creating a synthetic event
            const form = document.getElementById('noteForm');
            if (form) {
                // Create a proper event with the form as target
                const event = new Event('submit');
                Object.defineProperty(event, 'target', { value: form });
                window.handleNoteFormSubmit(event);
            } else {
                console.error("Form not found when save button clicked");
                alert("Error: Form not found");
            }
            return false;
        });
    }
}, 500);
}

// Set up a global observer to detect when the note form is added to the DOM
document.addEventListener('DOMContentLoaded', function() {
    // Create a mutation observer to watch for changes to the modal container
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length > 0) {
                // Check if the note form has been added
                if (document.querySelector('#noteForm')) {
                    console.log("Note form detected in DOM");
                    initializeNoteForm();
                }
            }
        });
    });

    // Start observing the modal container for changes
    const modalContainer = document.getElementById('modal-container');
    if (modalContainer) {
        observer.observe(modalContainer, { childList: true, subtree: true });
    }
});