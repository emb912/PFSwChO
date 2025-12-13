# A. Utworzenie klastra z 4 węzłami
```
minikube start -n 4 --cni=calico -d docker --wait=all -p quadruple
```
W moim przypadku konieczne było dodanie opcji `--wait=all`, które nakazuje minikube start oczekiwać na pomyślne uruchomienie i pełną gotowość wszystkich komponentów klastra, zanim polecenie zakończy działanie. Bez podczas tworzenia klastra pojawiał się błąd "failed to start node".

```
emilia@wojcik:~$ kubectl get nodes
NAME            STATUS   ROLES           AGE   VERSION
quadruple       Ready    control-plane   77s   v1.34.0
quadruple-m02   Ready    <none>          49s   v1.34.0
quadruple-m03   Ready    <none>          32s   v1.34.0
quadruple-m04   Ready    <none>          15s   v1.34.0
```
Wszystkie cztery węzły zostały utworzone pomyślnie.
Za pomocą poleceia
```
kubectl label node quadruple-m03 role=backend
``` 
Nadałam etykietę węzłowi, na którym będą umieszczone Pod-y backend oraz my-sql. Takie rozwiązanie umożliwia jednoznaczne sterowanie rozmieszczeniem komponentów backendowych przy użyciu mechanizmów nodeAffinity oraz spełnia wymaganie zadania dotyczące lokalizacji Pod-ów backendu i bazy danych.
# B. Tworzenie obiektów
## 1. Przestrzeń nazw frontend, Deployment o nazwie frontend 
### Przestrzeń nazw frontend
```
kubectl create namespace frontend --dry-run=client -o yaml > ns-frontend.yaml
```
Aby utworzyć przestrzeń nazw na podstawie manifestu, wykonuję polecenie: `kubectl create -f ns-frontend.yaml`.
### Deployment frontend
```
kubectl create deploy frontend --image=nginx --replicas=3 -n frontend --dry-run=client -o yaml > deploy-frontend.yaml
```
Następnie zmodyfikowałam utworzony powyższym poleceniem manifest, w celu wymuszenia rozmieszczenia Pod-ów aplikacji frontend wyłącznie na węzłach przeznaczonych dla tej warstwy zastosowano mechanizm nodeAffinity. Użycie reguły requiredDuringSchedulingIgnoredDuringExecution gwarantuje, że Pod nie zostanie uruchomiony na węźle posiadającym etykietę `role=backend`. Oprócz tego konieczne było dodanie konfiguracji resources tak, aby HPA tworzone później mogło działać poprawnie.

Aby utworzyć Deployment frontend na podstawie manifestu, wykonuję polecenie `kubectl create -f deploy-frontend.yaml`.
## 2. Przestrzeń nazw backend, Deployment o nazwie backend 
### Przestrzeń nazw backend
```
kubectl create namespace backend --dry-run=client -o yaml > ns-backend.yaml
```
Aby utworzyć przestrzeń nazw na podstawie manifestu, wykonuję polecenie: `kubectl create -f ns-backend.yaml`.
### Deployment backend
```
kubectl create deploy backend --image=nginx --replicas=1 -n backend --dry-run=client -o yaml > deploy-backend.yaml
```
Następnie zmodyfikowałam utworzony powyższym poleceniem manifest, w celu wymuszenia rozmieszczenia Pod-ów aplikacji backend wyłącznie na węźle z etykietą backend. Użycie reguły requiredDuringSchedulingIgnoredDuringExecution gwarantuje, że Pod nie zostanie uruchomiony na węźle bez etykiety `role=backend`.
Aby utworzyć Deployment backend na podstawie manifestu, wykonuję polecenie `kubectl create -f deploy-backend.yaml`.
## 3. Pod my-sql
```
kubectl run my-sql --image=mysql --env=MYSQL_ROOT_PASSWORD=root -n backend --dry-run=client -o yaml > pod-mysql.yaml
```
Następnie zmodyfikowałam utworzony powyższym poleceniem manifest, w celu wymuszenia rozmieszczenia Pod-u my-sql na węźle z etykietą backend. Użycie reguły requiredDuringSchedulingIgnoredDuringExecution gwarantuje, że Pod nie zostanie uruchomiony na węźle bez etykiety `role=backend`.
Aby utworzyć Pod my-sql na podstawie manifestu, wykonuję polecenie `kubectl create -f pod-mysql.yaml`.

## Weryfikacja poprawnego utworzenia Pod-ów
```
emilia@wojcik:~$ kubectl get pods -n frontend -o wide
NAME                       READY   STATUS    RESTARTS   AGE   IP               NODE            NOMINATED NODE   READINESS GATES
frontend-c5c95bd68-h2p7k   1/1     Running   0          13m   10.244.243.65    quadruple-m02   <none>           <none>
frontend-c5c95bd68-phzfl   1/1     Running   0          13m   10.244.151.3     quadruple       <none>           <none>
frontend-c5c95bd68-v5wr7   1/1     Running   0          13m   10.244.239.193   quadruple-m04   <none>           <none>
emilia@wojcik:~$ kubectl get pods -n backend -o wide
NAME                       READY   STATUS    RESTARTS   AGE     IP             NODE            NOMINATED NODE   READINESS GATES
backend-6b7cfc56d7-llvwt   1/1     Running   0          10m     10.244.234.1   quadruple-m03   <none>           <none>
my-sql                     1/1     Running   0          2m17s   10.244.234.2   quadruple-m03   <none>           <none>
```
Jak widać, Pod-y Deployment-u frontend zostały porozmieszczane na różnych węzłach, ale nie na `quadruple-m03`, który ma etykietę `backend`, zaś Pod Deployment-u backend oraz Pod my-sql zostały utworzone na węźle `quadruple-m03`, czyli wszystko przebiega zgodnie z oczekiwaniami.

## 4. Obiekty Service typu NodePort dla Deployment-u frontend
```
kubectl expose deploy frontend -n frontend --type=NodePort --port=80 --target-port=80 --name=frontend-svc --dry-run=client -o yaml > svc-frontend.yaml
```
Weryfikuję poprawność utworzenia serwisu:
```
emilia@wojcik:~$ kubectl get svc -n frontend
NAME           TYPE       CLUSTER-IP     EXTERNAL-IP   PORT(S)        AGE
frontend-svc   NodePort   10.97.168.77   <none>        80:31465/TCP   4m41s
```
## 5. Obiekty Service typu ClusterIP dla Deployment-u backend oraz Pod-a my-sql
### Service dla Deployment-u backend
```
kubectl expose deploy backend -n backend --type=ClusterIP --port=80 --target-port=80 --name=backend-svc --dry-run=client -o yaml > svc-backend.yaml
```
Utworzenie: `kubectl create -f svc-backend.yaml`.
### Service dla Pod-a my-sql
```
kubectl expose pod my-sql -n backend --type=ClusterIP --port=3306 --target-port=3306 --name=mysql-svc --dry-run=client -o yaml > svc-mysql.yaml
```
Utworzenie: `kubectl create -f svc-mysql.yaml`.
### Weryfikuję poprawność utworzenia serwisów:
```
emilia@wojcik:~$ kubectl get svc -n backend
NAME          TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)    AGE
backend-svc   ClusterIP   10.108.76.124   <none>        80/TCP     2m1s
mysql-svc     ClusterIP   10.98.252.239   <none>        3306/TCP   115s
```
# C. Opracowanie NetworkPolicy
## 1.
Polityka sieciowa ogranicza ruch wychodzący z Pod-ów Deployment-u frontend wyłącznie do Pod-ów Deployment-u backend w przestrzeni nazw backend na port 80, blokując wszystkie pozostałe połączenia. Dodatkowo zezwalam na ruch wyjściowy na porcie 53 (DNS). Bez tego próba komunikacji pomiędzy Pod-ami jest blokowana podczas próby połączenia.
```
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: frontend-egress-to-backend
  namespace: frontend
spec:
  podSelector:
    matchLabels:
      app: frontend
  policyTypes:
    - Egress
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: backend
          podSelector:
            matchLabels:
              app: backend
      ports:
        - protocol: TCP
          port: 80
    - ports:
      - protocol: UDP
        port: 53
      - protocol: TCP
        port: 53
```
Utworzenie polityki sieciowej poleceniem: `kubectl create -f netpol-frontend.yaml`.
Została utworzona poprawnie:
```
emilia@wojcik:~$ kubectl get netpol -n frontend
NAME                         POD-SELECTOR   AGE
frontend-egress-to-backend   app=frontend   6m49s
```

## 2.
Polityka sieciowa ogranicza ruch wychodzący z Pod-ów Deployment-u backend wyłącznie do Pod-a my-sql na porcie 3306 oraz do Pod-ów Deployment-u frontend w przestrzeni nazw frontend, blokując wszystkie pozostałe połączenia. Ponownie, dodatkowo zezwalam na ruch wyjściowy na porcie 53 (DNS). Bez tego próba komunikacji pomiędzy Pod-ami jest blokowana podczas próby połączenia.
```
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backend-egress
  namespace: backend
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
    - Egress
  egress:
    # Allow DNS resolution
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53

    # 1. backend -> my-sql na port 3306
    - to:
        - podSelector:
            matchLabels:
              run: my-sql
      ports:
        - protocol: TCP
          port: 3306

    # 2. backend -> frontend na dowolny port
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: frontend
          podSelector:
            matchLabels:
              app: frontend
```
Utworzenie polityki sieciowej poleceniem: `kubectl create -f netpol-backend.yaml`.
Polityka sieciowa utworzona poprawnie:
```
emilia@wojcik:~$ kubectl get netpol -n backend
NAME             POD-SELECTOR   AGE
backend-egress   app=backend    46s
```
## Weryfikacja poprawności działania polityk sieciowych
Ponieważ utworzone Pod-y nie mają dostępu do Internetu z powodu NetworkPolicy, nie ma możliwości pobrania do nich wget poprzez aktualizację. Konieczne jest utworzenie Pod-ów testowych w odpowiednich przestrzeniach nazw i nadanie im odpowiednich etykiet, aby były "odbierane" tak jak Pod-y opisywane w zadaniu.
```
kubectl run net-test -n frontend --image=busybox --restart=Never -- sleep 3600
kubectl label pod net-test -n frontend app=frontend
kubectl run net-test-2 -n backend --image=busybox --restart=Never -- sleep 3600
kubectl label pod net-test-2 -n backend app=backend
```
Testowanie:
```
emilia@wojcik:~$ kubectl exec -n frontend net-test -- wget -qO- http://backend-svc.backend.svc.cluster.local
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
Zgodnie z oczekiwaniami połączenie działa, bo dozwolone jest połączenie frontend -> backend na TCP/80.

```
emilia@wojcik:~$ kubectl exec -n frontend net-test -- nc -zv backend-svc.backend.svc.cluster.local 81
```
Nastąpił timeout, ponieważ zostało wykonane połączenie frontend -> backend, ale na port inny niż 80.
```
emilia@wojcik:~$ kubectl exec -n frontend net-test -- nc -zv mysql-svc.backend.svc.cluster.local 3306
```
Nastąpił timeout, ponieważ frontend nie ma prawa łączyć się z Pod-em my-sql.

```
emilia@wojcik:~$ kubectl exec -n backend net-test-2 -- nc -zv mysql-svc.backend.svc.cluster.local 3306
mysql-svc.backend.svc.cluster.local (10.98.252.239:3306) open
```
Działa zgodnie z oczekiwaniem, bo połączenie backend -> mysql na port 3306 jest dozwolone.
```
emilia@wojcik:~/$ kubectl exec -n backend net-test-2 -- nc -zv mysql-svc.backend.svc.cluster.local 80
```
Nastąpił timeout, bo połączenie backend -> mysql dozwolone tylko na port 3306.
```
emilia@wojcik:~$ kubectl exec -n backend net-test-2 -- nc -zv frontend-svc.frontend.svc.cluster.local 80
frontend-svc.frontend.svc.cluster.local (10.97.168.77:80) open
```
Zgodnie z oczekiwaniem, połączenie jest możliwe.

# D. Ograniczenie ilości Pod-ów i dostępnych zasobów
## 1. W przestrzeni nazw frontend
```
kubectl create quota frontend-quota --hard=pods=10,requests.cpu=1000m,requests.memory=1.5Gi -n frontend --dry-run=client -o yaml > quota-frontend.yaml
```
Utworzenie na podstawie manifestu: `kubectl create -f quota-frontend.yaml`.
Weryfikacja poprawności utworzenia:
```
emilia@wojcik:~$ kubectl describe quota frontend-quota -n frontend
Name:            frontend-quota
Namespace:       frontend
Resource         Used  Hard
--------         ----  ----
pods             3     10
requests.cpu     0     1
requests.memory  0     1536Mi
```
Oprócz tego utworzyłam obiekt LimitRange tak, aby nowotworzone Pod-y automatycznie miały przypisywane requests i limits nawet, jeśli nie zostanie to podane przy ich tworzeniu. To pozwala uniknąć kłopotów przy późniejszym tworzeniu nowych obiektów. (Na taki problem napotkałam podczas testowania, dlatego uzupełniłam rozwiązanie o obiekty LimitRange.)
```
apiVersion: v1
kind: LimitRange
metadata:
  name: frontend-limits
  namespace: frontend
spec:
  limits:
  - type: Container
    defaultRequest:
      cpu: 100m
      memory: 140Mi
    default:
      cpu: 100m
      memory: 140Mi
```
Powyższe wartości zostały ustalone w taki sposób, że przy utworzeniu 10 Pod-ów, i tak nie zostaną przekroczone limity ustawione w ResourceQuota.
10 * 100m CPU = 1000m oraz 10 * 140Mi = 1.400Mi, co mieści się w limitach ResourceQuota.

## 2. W przestrzeni nazw backend
```
kubectl create quota backend-quota --hard=pods=3,requests.cpu=1000m,requests.memory=1Gi -n backend --dry-run=client -o yaml > quota-backend.yaml
```
Utworzenie na podstawie manifestu: `kubectl create -f quota-backend.yaml`.
Weryfikacja poprawności utworzenia:
```
emilia@wojcik:~/$ kubectl describe quota backend-quota -n backend
Name:            backend-quota
Namespace:       backend
Resource         Used  Hard
--------         ----  ----
pods             2     3
requests.cpu     0     1
requests.memory  0     1Gi
```
Analogicznie utworzyłam także LimitRange.
```
apiVersion: v1
kind: LimitRange
metadata:
  name: backend-limits
  namespace: backend
spec:
  limits:
  - type: Container
    defaultRequest:
      cpu: 100m
      memory: 128Mi
    default:
      cpu: 300m
      memory: 332Mi
```
Powyższe wartości ustaliłam ponownie tak, że gdy zostaną utworzone 3 Pod-y (czyli maksimum zdefiniowane w ResourceQuota), to nie zostaną przekroczone wartości.
3 * 100m CPU = 300m oraz 3 * 128Mi = 384Mi.

# E. Autoskaler HPA dla Deployment-u frontend
```
kubectl autoscale deployment frontend -n frontend --min=3 --max=10 --cpu=25% --memory=25% --dry-run=client -o yaml > hpa-frontend.yaml
```
Utworzenie poleceniem `kubectl create -f hpa-frontend.yaml`.
Jeden Pod frontend ma requests.cpu = 100m, maks. 10 Pod-ów -> 1000m CPU, czyli dokładnie tyle, ile dopuszcza ResourceQuota. Zatem Scheduler zablokuje każdą próbę przekroczenia. Średnie zużycie ustawiłam na 25%, aby przy testach było lepiej widać działanie HPA. 
Początkowo obiekt HPA nie prezentował bieżącego wykorzystania CPU (\<unknown\>), mimo działającego Metrics Server. Przyczyną był brak zdefiniowanego parametru resources.requests.cpu w Deployment-cie frontend, który jest wymagany do obliczania procentowego wykorzystania zasobów przez HPA. Po uzupełnieniu tej konfiguracji autoskaler rozpoczął poprawne monitorowanie obciążenia.

```
emilia@wojcik:~$ kubectl get hpa -n frontend
NAME       REFERENCE             TARGETS                       MINPODS   MAXPODS   REPLICAS   AGE
frontend   Deployment/frontend   cpu: 0%/25%, memory: 7%/25%   3         10        3          3h21m
```
HPA zostało utworzone poprawnie i monitoruje zużycie wskazanych zasobów.

# G. Weryfikacja poprawności działania HPA
Utworzyłam Pod-a, który będzie generował obciążenie:
```
emilia@wojcik:~/$ kubectl run load-generator -n frontend --image=httpd --restart=Never -- sh -c '
    while true; do
      ab -n 70000 -c 100 http://frontend-svc.frontend.svc.cluster.local/;
    done
  '  
```
W kolejnym oknie terminala wykonałam polecenie, które ma na celu monitorowanie zużycia zasobów. Obserwując powolne zmiany w przyroście zużywanych zasobów, dodawałam kolejne Pod-y load-generator
```
emilia@wojcik:~$ kubectl get hpa -n frontend -w
NAME       REFERENCE             TARGETS                       MINPODS   MAXPODS   REPLICAS   AGE
frontend   Deployment/frontend   cpu: 0%/25%, memory: 6%/25%   3         10        3          5h56m
frontend   Deployment/frontend   cpu: 11%/25%, memory: 6%/25%   3         10        3          5h57m
frontend   Deployment/frontend   cpu: 33%/25%, memory: 6%/25%   3         10        3          5h58m
frontend   Deployment/frontend   cpu: 33%/25%, memory: 6%/25%   3         10        4          5h58m
frontend   Deployment/frontend   cpu: 29%/25%, memory: 5%/25%   3         10        4          5h59m
frontend   Deployment/frontend   cpu: 26%/25%, memory: 5%/25%   3         10        4          6h
frontend   Deployment/frontend   cpu: 26%/25%, memory: 5%/25%   3         10        4          6h1m
frontend   Deployment/frontend   cpu: 26%/25%, memory: 5%/25%   3         10        4          6h2m
frontend   Deployment/frontend   cpu: 26%/25%, memory: 5%/25%   3         10        4          6h3m
frontend   Deployment/frontend   cpu: 26%/25%, memory: 5%/25%   3         10        4          6h4m

```
W trzecim oknie monitoruję Pod-y działające w przestrzeni nazw frontend:
```
emilia@wojcik:~$ kubectl get pods -n frontend -w
NAME                        READY   STATUS    RESTARTS   AGE
frontend-7b8456bbcb-76ldx   1/1     Running   0          5h37m
frontend-7b8456bbcb-q2b7n   1/1     Running   0          5h37m
frontend-7b8456bbcb-x7rwm   1/1     Running   0          5h37m
load-generator              0/1     Pending   0          0s
load-generator              0/1     Pending   0          0s
load-generator              0/1     ContainerCreating   0          0s
load-generator              0/1     ContainerCreating   0          1s
load-generator              1/1     Running             0          3s
frontend-7b8456bbcb-5g6wb   0/1     Pending             0          1s
frontend-7b8456bbcb-5g6wb   0/1     Pending             0          1s
frontend-7b8456bbcb-5g6wb   0/1     ContainerCreating   0          1s
frontend-7b8456bbcb-5g6wb   0/1     ContainerCreating   0          1s
frontend-7b8456bbcb-5g6wb   1/1     Running             0          4s
```
Widać, że HPA zachowuje się poprawnie i przeprowadza skalowanie. CPU jest tuż nad targetem, więc HPA nie skaluje dalej w górę ani też nie skaluje w dół. Jest to zgodne z mechanizmem stabilizacji autoskalera, który zapobiega częstym zmianom liczby replik przy niewielkich fluktuacjach obciążenia.
# Część nieobowiązkowa
## 1. 
Tak, jest możliwe dokonanie aktualizacji aplikacji frontend, kiedy jest ona pod kontrolą HPA. Jest o tym wspomniane w dokumentacji:
https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/#autoscaling-during-rolling-update
## 2. 
Do pliku deploy-frontend.yaml należy dodać:
```
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxUnavailable: 1
    maxSurge: 0
```
### a) Gwarancja, że zawsze działają co najmniej 2 Pod-y frontend
Najgorszy moment aktualizacji:
HPA minReplicas = 3
maxUnavailable: 1
Zatem w trakcie aktualizacji maksymalnie 1 Pod może być niedostępny, czyli: 3 − 1 = 2 aktywne Pody 
### b) Nie zostaną przekroczone parametry wcześniej zdefiniowanych ograniczeń zdefiniowanych dla przestrzeni nazw frontend
Aby nie przekroczyć limitu Pod-ów, maxSurge jest ustawione na 0, czyli nie zostanie utworzony nadmiarowy Pod, który przekroczyłby ustalone maximum (10).
### c) Jeśli okaże się, że należy skorelować (zmieć) ustawienia autoskalera HPA zdefiniowanego w części obowiązkowej w związku z zaplanowaną strategią aktualizacji to należy również przedstawić i uzasadnić te ewentualne zmiany
Nie, takie zmiany nie są konieczne, ponieważ RollingUpdate nie tworzy dodatkowych Pod-ów, HPA nadal może skalować w zakresie 3–10, nie ma konfliktu: z liczbą Podów, CPU oraz RAMem.
