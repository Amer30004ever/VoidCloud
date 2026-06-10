To run the GitHub Actions runner as a service, follow these steps:

## 1. Install the runner as a service

```bash
sudo ./svc.sh install
```

## 2. Start the service

```bash
sudo ./svc.sh start
```

## 3. Check the service status

```bash
sudo ./svc.sh status
```

## Useful service commands:

```bash
# Stop the service
sudo ./svc.sh stop

# Restart the service
sudo ./svc.sh restart

# Check service logs
sudo ./svc.sh status

# Uninstall the service (if needed)
sudo ./svc.sh uninstall
```

## Verify the service is running:

```bash
# Check if the service process is running
ps aux | grep runner

# Or check systemd service status (since it installs as a systemd service)
sudo systemctl status actions.runner.Amer30004ever.Amer-Devops-Poral.workernode01.service
```

## Important notes:

1. **The service will automatically start on system boot** once installed
2. **The service runs as root** by default (since you used `sudo`)
3. **The runner name** in your case appears to be `workernode01` (from your configuration)
4. **The work folder** you set is `amer_devops_portal`

## If you need to reconfigure or uninstall:

```bash
# Remove the service
sudo ./svc.sh uninstall

# Reconfigure with different settings
./config.sh remove --token <YOUR_TOKEN>
./config.sh --url https://github.com/Amer30004ever/Amer-Devops-Poral --token <NEW_TOKEN>

# Reinstall service
sudo ./svc.sh install
sudo ./svc.sh start
```

## To view real-time logs:
```bash
# View runner diagnostic logs
tail -f ./amer_devops_portal/_diag/Runner_*.log

# View runner service logs (if using journald)
sudo journalctl -u actions.runner.Amer30004ever.Amer-Devops-Poral.workernode01.service -f
```

Your runner should now be running as a background service and will automatically restart on system reboots!