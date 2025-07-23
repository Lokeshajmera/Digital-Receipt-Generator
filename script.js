// Application State
let items = [];
let receiptGenerated = false;

// Initialize EmailJS - Use environment variable or default
emailjs.init(window.ENV?.EMAILJS_PUBLIC_KEY || "your_emailjs_public_key_here");

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

/**
 * Initialize the application
 */
function initializeApp() {
    // Set current date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('receiptDate').value = today;
    
    // Generate receipt number
    generateReceiptNumber();
    
    // Add initial item
    addItem();
    
    // Add event listeners
    addEventListeners();
    
    // Initialize discount field state
    updateDiscountField();
}

/**
 * Add event listeners for real-time calculations and Enter key navigation
 */
function addEventListeners() {
    const customerName = document.getElementById('customerName');
    const businessName = document.getElementById('businessName');
    
    customerName.addEventListener('input', validateForm);
    businessName.addEventListener('input', validateForm);
    
    // Add event listeners for discount type
    const discountType = document.getElementById('discountType');
    discountType.addEventListener('change', updateDiscountField);
    
    // Add Enter key navigation
    setupEnterKeyNavigation();
}

/**
 * Generate a unique receipt number
 */
function generateReceiptNumber() {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    const receiptNumber = `RCP${year}${month}${day}${random}`;
    document.getElementById('receiptNumber').value = receiptNumber;
}

/**
 * Format date for display
 */
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

/**
 * Setup Enter key navigation between form fields
 */
function setupEnterKeyNavigation() {
    // Get all form inputs in order
    const formInputs = [
        'businessName',
        'businessAddress',
        'businessGST',
        'businessPhone', 
        'businessEmail',
        'customerName',
        'receiptDate',
        'customerEmail'
    ];
    
    // Add enter key navigation for main form fields
    formInputs.forEach((inputId, index) => {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const nextIndex = index + 1;
                    if (nextIndex < formInputs.length) {
                        const nextInput = document.getElementById(formInputs[nextIndex]);
                        if (nextInput) {
                            nextInput.focus();
                        }
                    } else {
                        // Move to first item input
                        const firstItemInput = document.querySelector('.item-name-input');
                        if (firstItemInput) {
                            firstItemInput.focus();
                        }
                    }
                }
            });
        }
    });
    
    // Add enter key navigation for item inputs
    setupItemEnterNavigation();
}

/**
 * Add a new item row
 */
function addItem() {
    const itemsContainer = document.getElementById('itemsContainer');
    const itemIndex = items.length;
    
    const itemRow = document.createElement('div');
    itemRow.className = 'item-row';
    itemRow.setAttribute('data-index', itemIndex);
    
    itemRow.innerHTML = `
        <div data-label="Item Name:">
            <input type="text" 
                   placeholder="Enter item name" 
                   class="item-name-input" 
                   onchange="updateItem(${itemIndex}, 'name', this.value)"
                   required>
        </div>
        <div data-label="Quantity:">
            <input type="number" 
                   placeholder="Qty" 
                   min="0.01" 
                   step="0.01" 
                   class="item-quantity-input" 
                   onchange="updateItem(${itemIndex}, 'quantity', this.value)"
                   required>
        </div>
        <div data-label="Price:">
            <input type="number" 
                   placeholder="Price" 
                   min="0.01" 
                   step="0.01" 
                   class="item-price-input" 
                   onchange="updateItem(${itemIndex}, 'price', this.value)"
                   required>
        </div>
        <div class="item-total" data-label="Total:">₹0.00</div>
        <div class="item-actions">
            <button type="button" class="btn-remove" onclick="removeItem(${itemIndex})">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    
    itemsContainer.appendChild(itemRow);
    
    // Initialize item in items array
    items.push({
        name: '',
        quantity: 0,
        price: 0,
        total: 0
    });
    
    // Setup enter key navigation for new item
    setupItemEnterNavigation();
}

/**
 * Update item data and recalculate totals
 */
function updateItem(index, field, value) {
    if (!items[index]) return;
    
    // Convert to appropriate type
    if (field === 'quantity' || field === 'price') {
        value = parseFloat(value) || 0;
    }
    
    items[index][field] = value;
    
    // Calculate item total
    if (field === 'quantity' || field === 'price') {
        items[index].total = items[index].quantity * items[index].price;
        
        // Update display
        const itemRow = document.querySelector(`[data-index="${index}"]`);
        const totalElement = itemRow.querySelector('.item-total');
        totalElement.textContent = `₹${items[index].total.toFixed(2)}`;
    }
    
    // Recalculate totals
    calculateTotals();
    validateForm();
}

/**
 * Remove an item
 */
function removeItem(index) {
    if (items.length <= 1) {
        showMessage('At least one item is required', 'error');
        return;
    }
    // Remove from items array
    items.splice(index, 1);
    
    // Remove from DOM
    const itemRow = document.querySelector(`[data-index="${index}"]`);
    itemRow.remove();
    
    // Re-index remaining items
    reindexItems();
    
    // Setup enter key navigation again after re-indexing
    setupItemEnterNavigation();
    
    // Recalculate totals
    calculateTotals();
    validateForm();
}

/**
 * Re-index items after removal
 */
function reindexItems() {
    const itemRows = document.querySelectorAll('.item-row');
    itemRows.forEach((row, index) => {
        row.setAttribute('data-index', index);
        
        // Update event handlers
        const nameInput = row.querySelector('.item-name-input');
        const quantityInput = row.querySelector('.item-quantity-input');
        const priceInput = row.querySelector('.item-price-input');
        const removeBtn = row.querySelector('.btn-remove');
        
        nameInput.setAttribute('onchange', `updateItem(${index}, 'name', this.value)`);
        quantityInput.setAttribute('onchange', `updateItem(${index}, 'quantity', this.value)`);
        priceInput.setAttribute('onchange', `updateItem(${index}, 'price', this.value)`);
        removeBtn.setAttribute('onclick', `removeItem(${index})`);
    });
}

/**
 * Update discount field based on discount type
 */
function updateDiscountField() {
    const discountType = document.getElementById('discountType').value;
    const discountValue = document.getElementById('discountValue');
    
    if (discountType === 'none') {
        discountValue.disabled = true;
        discountValue.value = '';
    } else {
        discountValue.disabled = false;
        if (discountType === 'percentage') {
            discountValue.placeholder = 'Enter discount percentage';
            discountValue.max = '100';
        } else {
            discountValue.placeholder = 'Enter discount amount';
            discountValue.removeAttribute('max');
        }
    }
    calculateTotals();
}

/**
 * Setup Enter key navigation for item inputs
 */
function setupItemEnterNavigation() {
    // Remove existing listeners to avoid duplicates
    document.querySelectorAll('.item-name-input, .item-quantity-input, .item-price-input').forEach(input => {
        const newInput = input.cloneNode(true);
        input.parentNode.replaceChild(newInput, input);
    });
    
    // Add new listeners
    document.querySelectorAll('.item-row').forEach((row, rowIndex) => {
        const inputs = row.querySelectorAll('.item-name-input, .item-quantity-input, .item-price-input');
        
        inputs.forEach((input, inputIndex) => {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    
                    // Move to next input in same row
                    if (inputIndex < inputs.length - 1) {
                        inputs[inputIndex + 1].focus();
                    } else {
                        // Move to first input of next row or add new item
                        const allRows = document.querySelectorAll('.item-row');
                        if (rowIndex < allRows.length - 1) {
                            const nextRowFirstInput = allRows[rowIndex + 1].querySelector('.item-name-input');
                            if (nextRowFirstInput) {
                                nextRowFirstInput.focus();
                            }
                        } else {
                            // Add new item and focus on its first input
                            addItem();
                            setTimeout(() => {
                                const newItemInput = document.querySelector('.item-row:last-child .item-name-input');
                                if (newItemInput) {
                                    newItemInput.focus();
                                }
                            }, 10);
                        }
                    }
                }
            });
            
            // Restore onchange handlers
            if (input.classList.contains('item-name-input')) {
                const index = parseInt(row.dataset.index);
                input.onchange = function() { updateItem(index, 'name', this.value); };
            } else if (input.classList.contains('item-quantity-input')) {
                const index = parseInt(row.dataset.index);
                input.onchange = function() { updateItem(index, 'quantity', this.value); };
            } else if (input.classList.contains('item-price-input')) {
                const index = parseInt(row.dataset.index);
                input.onchange = function() { updateItem(index, 'price', this.value); };
            }
        });
    });
}

/**
 * Calculate subtotal, discount, GST, and grand total
 */
function calculateTotals() {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    
    // Get GST rate
    const gstRate = parseFloat(document.getElementById('gstRate').value) / 100;
    
    // Calculate discount
    const discountType = document.getElementById('discountType').value;
    const discountValue = parseFloat(document.getElementById('discountValue').value) || 0;
    let discountAmount = 0;
    
    if (discountType === 'percentage') {
        discountAmount = subtotal * (discountValue / 100);
    } else if (discountType === 'flat') {
        discountAmount = Math.min(discountValue, subtotal); // Don't allow discount > subtotal
    }
    
    const discountedSubtotal = subtotal - discountAmount;
    const gstAmount = discountedSubtotal * gstRate;
    const grandTotal = discountedSubtotal + gstAmount;
    
    // Update display
    document.getElementById('subtotal').textContent = `₹${subtotal.toFixed(2)}`;
    
    // Show/hide discount row
    const discountRow = document.getElementById('discountRow');
    const discountLabel = document.getElementById('discountLabel');
    const discountAmountSpan = document.getElementById('discountAmount');
    
    if (discountAmount > 0) {
        discountRow.style.display = 'flex';
        if (discountType === 'percentage') {
            discountLabel.textContent = `Discount (${discountValue}%):`;
        } else {
            discountLabel.textContent = 'Discount:';
        }
        discountAmountSpan.textContent = `-₹${discountAmount.toFixed(2)}`;
    } else {
        discountRow.style.display = 'none';
    }
    
    // Update GST label and amount
    const gstLabel = document.getElementById('gstLabel');
    const gstAmount_display = document.getElementById('gstAmount');
    const gstPercentage = parseFloat(document.getElementById('gstRate').value);
    
    gstLabel.textContent = `GST (${gstPercentage}%):`;
    gstAmount_display.textContent = `₹${gstAmount.toFixed(2)}`;
    
    // Update grand total
    document.getElementById('grandTotal').textContent = `₹${grandTotal.toFixed(2)}`;
}

/**
 * Validate form and enable/disable generate button
 */
function validateForm() {
    const businessName = document.getElementById('businessName').value.trim();
    const customerName = document.getElementById('customerName').value.trim();
    
    // Check if required fields are filled
    let hasValidItems = items.some(item => 
        item.name.trim() && item.quantity > 0 && item.price > 0
    );
    
    const isValid = businessName && customerName && hasValidItems;
    
    // No need to enable/disable buttons as per original implementation
    return isValid;
}

/**
 * Generate and display receipt
 */
function generateReceipt() {
    if (!validateForm()) {
        showMessage('Please fill in all required fields and add at least one valid item', 'error');
        return;
    }
    
    try {
        // Populate receipt with form data
        populateReceiptData();
        
        // Show receipt preview
        const receiptPreview = document.getElementById('receiptPreview');
        receiptPreview.style.display = 'block';
        receiptPreview.classList.add('show');
        
        // Enable action buttons
        document.getElementById('downloadBtn').disabled = false;
        document.getElementById('emailBtn').disabled = false;
        document.getElementById('printBtn').disabled = false;
        
        receiptGenerated = true;
        
        // Scroll to receipt
        receiptPreview.scrollIntoView({ behavior: 'smooth' });
        
        showMessage('Receipt generated successfully!', 'success');
    } catch (error) {
        console.error('Error generating receipt:', error);
        showMessage('Error generating receipt. Please try again.', 'error');
    }
}

/**
 * Populate receipt with form data
 */
function populateReceiptData() {
    // Business information
    const businessName = document.getElementById('businessName').value.trim();
    const businessAddress = document.getElementById('businessAddress').value.trim();
    const businessPhone = document.getElementById('businessPhone').value.trim();
    const businessEmail = document.getElementById('businessEmail').value.trim();
    const businessGST = document.getElementById('businessGST').value.trim();
    
    document.getElementById('receiptBusinessName').textContent = businessName;
    document.getElementById('receiptBusinessAddress').textContent = businessAddress;
    document.getElementById('receiptBusinessGST').textContent = businessGST ? `GST: ${businessGST}` : '';
    
    // Business contact info
    const contactInfo = [];
    if (businessPhone) contactInfo.push(`Phone: ${businessPhone}`);
    if (businessEmail) contactInfo.push(`Email: ${businessEmail}`);
    document.getElementById('receiptBusinessContact').innerHTML = contactInfo.join('<br>');
    
    // Receipt information
    document.getElementById('receiptNumDisplay').textContent = document.getElementById('receiptNumber').value;
    document.getElementById('receiptDateDisplay').textContent = formatDate(document.getElementById('receiptDate').value);
    document.getElementById('receiptCustomerName').textContent = document.getElementById('customerName').value.trim();
    
    // Items table
    const tbody = document.getElementById('receiptItemsBody');
    tbody.innerHTML = '';
    
    items.filter(item => item.name.trim() && item.quantity > 0 && item.price > 0).forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.name}</td>
            <td>${item.quantity}</td>
            <td>₹${item.price.toFixed(2)}</td>
            <td>₹${item.total.toFixed(2)}</td>
        `;
        tbody.appendChild(row);
    });
    
    // Totals
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const gstRate = parseFloat(document.getElementById('gstRate').value);
    const discountType = document.getElementById('discountType').value;
    const discountValue = parseFloat(document.getElementById('discountValue').value) || 0;
    
    let discountAmount = 0;
    if (discountType === 'percentage') {
        discountAmount = subtotal * (discountValue / 100);
    } else if (discountType === 'flat') {
        discountAmount = Math.min(discountValue, subtotal);
    }
    
    const discountedSubtotal = subtotal - discountAmount;
    const gstAmount = discountedSubtotal * (gstRate / 100);
    const grandTotal = discountedSubtotal + gstAmount;
    
    document.getElementById('receiptSubtotal').textContent = `₹${subtotal.toFixed(2)}`;
    document.getElementById('receiptGST').textContent = `₹${gstAmount.toFixed(2)}`;
    document.getElementById('receiptGrandTotal').textContent = `₹${grandTotal.toFixed(2)}`;
    
    // Update GST label
    document.getElementById('receiptGSTLabel').textContent = `GST (${gstRate}%):`;
    
    // Handle discount display
    const receiptDiscountRow = document.getElementById('receiptDiscountRow');
    if (discountAmount > 0) {
        receiptDiscountRow.style.display = 'flex';
        const receiptDiscountLabel = document.getElementById('receiptDiscountLabel');
        if (discountType === 'percentage') {
            receiptDiscountLabel.textContent = `Discount (${discountValue}%):`;
        } else {
            receiptDiscountLabel.textContent = 'Discount:';
        }
        document.getElementById('receiptDiscountAmount').textContent = `-₹${discountAmount.toFixed(2)}`;
    } else {
        receiptDiscountRow.style.display = 'none';
    }
}

/**
 * Download receipt as PDF
 */
function downloadPDF() {
    if (!receiptGenerated) {
        showMessage('Please generate receipt first', 'warning');
        return;
    }

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'pt', 'a4');
        const receipt = document.getElementById('receipt');

        doc.html(receipt, {
            callback: function (doc) {
                const filename = `Receipt_${document.getElementById('receiptNumber').value || '0001'}.pdf`;
                doc.save(filename);
                showMessage('PDF downloaded successfully!', 'success');
            },
            x: 20,
            y: 20,
            width: 560,
            windowWidth: 800
        });
    } catch (error) {
        console.error('Error generating PDF:', error);
        showMessage('Error generating PDF. Please try again.', 'error');
    }
}


/**
 * Print receipt
 */
function printReceipt() {
    if (!receiptGenerated) {
        showMessage('Please generate receipt first', 'warning');
        return;
    }

    const printContents = document.getElementById('receipt').innerHTML;
    const originalContents = document.body.innerHTML;

    document.body.innerHTML = printContents;
    window.print();
    document.body.innerHTML = originalContents;
    location.reload(); // Reload to restore full page after printing
}
function emailReceipt() {
    if (!receiptGenerated) {
        showMessage('Please generate receipt first', 'warning');
        return;
    }

    const customerEmail = document.getElementById('customerEmail').value.trim();
    if (!customerEmail) {
        showMessage('Please enter customer email to send receipt', 'warning');
        return;
    }

    const emailParams = {
        to_name: document.getElementById('customerName').value || 'Customer',
        to_email: customerEmail,
        receipt_number: document.getElementById('receiptNumber').value || '0001',
        business_name: document.getElementById('businessName').value || 'Business',
        receipt_html: document.getElementById('receipt').outerHTML
    };
    emailjs.init('YOUR_PUBLIC_KEY'); // e.g. "S6j3PbX9s4Y..."

    emailjs.send('service_xxxxxx', 'template_yyyyyy', emailParams)

        .then(() => {
            showMessage('Receipt emailed successfully!', 'success');
        })
        .catch((error) => {
            console.error('Email sending error:', error);
            showMessage('Error sending email: ' + error.text, 'error');
});

}


/**
 * Show message to user
 */
function showMessage(text, type = 'info') {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.classList.add('show');
    
    // Hide message after 4 seconds
    setTimeout(() => {
        messageDiv.classList.remove('show');
    }, 4000);
}

// Server setup for serving files
if (typeof module !== 'undefined' && module.exports) {
    const express = require('express');
    const path = require('path');
    
    const app = express();
    const PORT = process.env.PORT || 5000;
    
    // Serve static files
    app.use(express.static(path.join(__dirname)));
    
    // Serve index.html for root route
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, 'index.html'));
    });
    
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Digital Receipt Generator running on http://0.0.0.0:${PORT}`);
    });
    
    module.exports = app;
}
