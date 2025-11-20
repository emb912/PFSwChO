# Utworzenie wymaganych zasobów
Pliki yaml umożliwiające stworzenie poszczególnych zasobów zostały wygenerowane za pomocą odpowiednich poleceń:
### 1. przestrzeń nazw remote
```
kubectl create ns remote --dry-run=client -o yaml > ns.yaml
```
### 2. Pod w przestrzeni nazw remote na bazie obrazu Nginx i obiekt Service, który umożliwia dostęp do Pod-a na porcie węzła minikube 31999
```
kubectl run remoteweb --image=nginx -n remote --dry-run=client -o yaml > remoteweb.yaml
kubectl expose pod remoteweb --port=80 --type=NodePort -n remote --dry-run=client -o yaml > remoteweb-svc.yaml
kubectl edit svc remoteweb -n remote
```
### 3. Pod w domyślnej przestrzeni nazw na bazie obrazu Busybox
```
kubectl run testpod --image=busybox --dry-run=client -o yaml -- sleep infinity > testpod.yaml
```
Następnie pliki yaml zostały połączone do jednego zbiorczego manifestu `finalmanifest.yaml`.

### utworzenie zasobów na podstawie pliku yaml
W celu utworzenia na bazie pliku yaml przestrzeni nazw remote, Pod-a remotweb oraz obiektu Service, umożliwiającego dostęp do Pod-a, należy wykonać polecenie:
```
kubectl create -f finalmanifest.yaml
```

Aby sprawdzić poprawność utworzenia zasobów, wykonuję następujące polecenia:
```
emilia@wojcik:~$ kubectl get pods -n remote
NAME        READY   STATUS    RESTARTS   AGE
remoteweb   1/1     Running   0          31m
```
Status Running, READY 1/1 i 0 restartów wskazują na poprawną pracę Pod-a remoteweb. Wynik polecenia `kubectl describe pod remoteweb -n remote` również nie wykazał nieprawidłowości.

```
emilia@wojcik:~$ kubectl get svc -n remote
NAME        TYPE       CLUSTER-IP      EXTERNAL-IP   PORT(S)        AGE
remoteweb   NodePort   10.101.114.37   <none>        80:31999/TCP   27m
```
Utworzony serwis ma oczekiwane parametry.

```
emilia@wojcik:~$ kubectl get pods
NAME                        READY   STATUS    RESTARTS       AGE
testpod                     1/1     Running   0              14m
```
Status Running, READY 1/1 i 0 restartów wskazują na poprawną pracę Pod-a remoteweb. Wynik polecenia `kubectl describe pod testpod` również nie wykazał wystąpienia nieprawidłowości.

# Weryfikacja działania
## dostęp do domowej strony internetowej Pod-a remoteweb
```
emilia@wojcik:~/lab7$ kubectl exec -it testpod -- wget --spider --timeout=1 http://remoteweb.remote.svc.cluster.local
Connecting to remoteweb.remote.svc.cluster.local (10.101.114.37:80)
remote file exists
```
Informacja "file exists" oznacza, że testpod widzi remoteweb przez DNS i może się połączyć.

## dostęp do strony na porcie węzła minikube 31999
```
emilia@wojcik:~/lab7$ curl http://$(minikube ip):31999
<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>
<style>
html { color-scheme: light dark; }
body { width: 35em; margin: 0 auto;
font-family: Tahoma, Verdana, Arial, sans-serif; }
</style>
</head>
<body>
<h1>Welcome to nginx!</h1>
<p>If you see this page, the nginx web server is successfully installed and
working. Further configuration is required.</p>

<p>For online documentation and support please refer to
<a href="http://nginx.org/">nginx.org</a>.<br/>
Commercial support is available at
<a href="http://nginx.com/">nginx.com</a>.</p>

<p><em>Thank you for using nginx.</em></p>
</body>
</html>
```
Zaprezentowany powyżej wynik polecenia oznacza, że strona wystawiona przez Pod remoteweb jest dostępna z hosta za pomocą adresu http://<minikube-ip>:31999. Pozwala to wywnioskować, że usługa typu NodePort została poprawnie skonfigurowana i kieruje ruch na kontener nginx działający w przestrzeni nazw remote.
