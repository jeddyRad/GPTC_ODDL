# Script PowerShell pour mettre à jour les références DataContextNew vers DataContext

$files = @(
    "src/App.tsx",
    "src/components/modals/TaskModal.tsx",
    "src/components/layout/Sidebar.tsx",
    "src/components/layout/Header.tsx",
    "src/components/views/Dashboard.tsx",
    "src/components/views/CalendarView.tsx",
    "src/components/views/AnalyticsView.tsx",
    "src/components/tasks/TaskBoard.tsx",
    "src/components/tasks/TaskColumn.tsx",
    "src/components/modals/EmployeeLoanModal.tsx",
    "src/components/forms/TaskForm.tsx",
    "src/components/views/NotificationsView.tsx",
    "src/components/layout/NotificationPanel.tsx",
    "src/components/views/ProjectsView.tsx",
    "src/components/views/SettingsView.tsx",
    "src/components/views/TeamView.tsx"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "Updating $file"
        (Get-Content $file) -replace "from '@/contexts/DataContextNew'", "from '@/contexts/DataContext'" | Set-Content $file
    }
}

Write-Host "All files updated!"
