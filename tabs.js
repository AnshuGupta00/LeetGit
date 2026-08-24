// tabs.js - Tab switching logic for popup.html

document.addEventListener('DOMContentLoaded', () => {
  // Tab switching logic
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;
      
      // Hide all tabs
      document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
      });
      
      // Show selected tab
      document.getElementById(tabName).classList.add('active');
      
      // Update active button
      document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('active');
      });
      btn.classList.add('active');
    });
  });
});