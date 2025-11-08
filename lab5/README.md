# Utworzenie wymaganych zasobów
W celu utworzenia przestrzeni nazw (ns-dev, ns-prod), obiektów (quota-dev, quota-prod) oraz LimitRange (dev-limit) należy wykonać polecenie:
```
kubectl create -f finalmanifest.yaml
```

# Testy utworzonych zasobów
## no-test
W celu utworzenia obiektu Deployment `no-test` należy wykonać polecenie:
```
kubectl create -f no-test.yaml
```
Po uruchomieniu obiektu no-test sprawdziłam poleceniem jego status:
```
emilia@wojcik:~/lab5_zad$ kubectl get deploy no-test -n ns-dev
NAME      READY   UP-TO-DATE   AVAILABLE   AGE
no-test   0/1     0            0           57m
```
Jak widać w sekcji READY jest 0/1. Ten status się utrzymuje przez cały czas od uruchomienia.
Następnie sprawdziłam, czy doszło do próby utworzenia poda:
```
emilia@wojcik:~/lab5_zad$ kubectl get rs -n ns-dev
NAME                   DESIRED   CURRENT   READY   AGE
no-test-5d7d88bdbb     1         0         0       58m
```
Jak widać, pod nie został uruchomiony (CURRENT 0, READY 0).
Sprawdziłam szczegóły poda:
```
emilia@wojcik:~/lab5_zad$ kubectl describe rs no-test-5d7d88bdbb -n ns-dev
(usuwam faragment dla czytelności)
Conditions:
  Type             Status  Reason
  ----             ------  ------
  ReplicaFailure   True    FailedCreate
Events:
  Type     Reason        Age                From                   Message
  ----     ------        ----               ----                   -------
  Warning  FailedCreate  50m (x9 over 61m)  replicaset-controller  (combined from similar events): Error creating: pods "no-test-5d7d88bdbb-p77v5" is forbidden: exceeded quota: quota-dev, requested: cpu=500m,memory=512Mi, used: cpu=100m,memory=128Mi, limited: cpu=200m,memory=256Mi
```
Widać błąd `exceeded quota: quota-dev`, czyli obiekt nie został uruchomiony ze względu na przekroczenie wymagań określonych w warunkach zadania.
Wynik potwierdza, że no-test przekroczył dozwolone limity zasobów określone w quota-dev, przez co Pod nie został utworzony.

## yes-test
W celu utworzenia obiektu Deployment `yes-test` należy wykonać polecenie:
```
kubectl create -f yes-test.yaml
```
Po uruchomieniu obiektu sprawdzam, jaki jest jego status:
```
emilia@wojcik:~/lab5_zad$ kubectl get deploy yes-test -n ns-dev
NAME       READY   UP-TO-DATE   AVAILABLE   AGE
yes-test   1/1     1            1           56m
```
W sekcji READY mamy 1/1, czyli obiekt został utworzony poprawnie.
Sprawdzam, czy został utworzony pod:
```
emilia@wojcik:~/lab5_zad$ kubectl get pods -n ns-dev
NAME                         READY   STATUS    RESTARTS   AGE
yes-test-6fd7dd7c5b-2tnbg    1/1     Running   0          63m
```
Jest READY 1/1 i status RUNNING, czyli tak, jak powinno byc. 
Szczegóły poda:
```
emilia@wojcik:~/lab5_zad$ kubectl describe pod yes-test-6fd7dd7c5b-2tnbg -n ns-dev
Name:             yes-test-6fd7dd7c5b-2tnbg
Namespace:        ns-dev
Priority:         0
Service Account:  default
Node:             minikube/192.168.49.2
Start Time:       Sat, 08 Nov 2025 17:11:53 +0100
Labels:           app=yes-test
                  pod-template-hash=6fd7dd7c5b
Annotations:      kubernetes.io/limit-ranger: LimitRanger plugin set: cpu, memory limit for container nginx
Status:           Running
(usuwam faragment dla czytelności)
Events:                      <none>
```
Wartości zasobów (requests i limits) mieszczą się w zakresie określonym przez LimitRange i ResourceQuota, dlatego pod został uruchomiony poprawnie.

## zero-test
W celu utworzenia obiektu Deployment `zero-test` należy wykonać polecenie:
```
kubectl create -f zero-test.yaml
```

Sprawdzam status utworzonego obiektu:
```
emilia@wojcik:~/lab5_zad$ kubectl get deploy zero-test -n ns-dev
NAME        READY   UP-TO-DATE   AVAILABLE   AGE
zero-test   1/1     1            1           63m
```
W sekcji READY mamy 1/1, czyli obiekt został utworzony poprawnie.

Sprawdzam status utworzonego poda:
```
emilia@wojcik:~/lab5_zad$ kubectl get pods -n ns-dev
NAME                         READY   STATUS    RESTARTS   AGE
zero-test-645589f969-9x7cx   1/1     Running   0          63m
```
Jest READY 1/1 Running, więc sprawdzam jakie są jego szczegóły:
```
emilia@wojcik:~/lab5_zad$ kubectl describe pod zero-test-645589f969-9x7cx -n ns-dev
Name:             zero-test-645589f969-9x7cx
Namespace:        ns-dev
Priority:         0
Service Account:  default
Node:             minikube/192.168.49.2
Start Time:       Sat, 08 Nov 2025 17:14:56 +0100
Labels:           app=zero-test
                  pod-template-hash=645589f969
Annotations:      kubernetes.io/limit-ranger: LimitRanger plugin set: cpu, memory request for container nginx; cpu, memory limit for container nginx
Status:           Running
IP:               10.244.0.236
IPs:
  IP:           10.244.0.236
Controlled By:  ReplicaSet/zero-test-645589f969
Containers:
  nginx:
    Container ID:   docker://300a4a69837f4a0df4e4daa99d2ec9ac64334e1fcbfbbdb8cde870c737cd8127
    Image:          nginx
    Image ID:       docker-pullable://nginx@sha256:1beed3ca46acebe9d3fb62e9067f03d05d5bfa97a00f30938a0a3580563272ad
    Port:           <none>
    Host Port:      <none>
    State:          Running
      Started:      Sat, 08 Nov 2025 17:15:00 +0100
    Ready:          True
    Restart Count:  0
    Limits:
      cpu:     200m
      memory:  256Mi
    Requests:
      cpu:        100m
      memory:     128Mi
(usuwam fragment dla czytelnosci)
Events:                      <none>
```
Jak widac limity zostały utworzone poprawnie na podstawie przyjętych założeń, `Limits: cpu=200m, memory=256Mi; defaultRequest: cpu=100m, memory: 128Mi` (tak jak w dev-limit).
