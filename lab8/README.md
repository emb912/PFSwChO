# 1. Utworzenie klastra z 4 węzłami
```
minikube start -n 4 --cni=calico -d docker --wait=all -p quadruple
```
W moim przypadku konieczne było dodanie opcji `--wait=all`, które nakazuje minikube start oczekiwać na pomyślne uruchomienie i pełną gotowość wszystkich komponentów klastra, zanim polecenie zakończy działanie. Bez podczas tworzenia klastra pojawiał się błąd "failed to start node".

```
emilia@wojcik:~$ kubectl get nodes
NAME            STATUS   ROLES           AGE     VERSION
quadruple       Ready    control-plane   3m5s    v1.34.0
quadruple-m02   Ready    <none>          2m46s   v1.34.0
quadruple-m03   Ready    <none>          2m34s   v1.34.0
quadruple-m04   Ready    <none>          2m21s   v1.34.0
```
Wszystkie cztery węzły zostały utworzone pomyślnie.
Za pomocą polecenia `kubectl label node quadruple-m02 node-role=A` nadałam etykietę węzłowi quadruple-m02, analogicznie postąpiłam z quadruple-m03 i quadruple-m04, nadając im odpowiednio etykiety B i C.

# 2. Tworzenie obiektów w klastrach
## Deployment frontend
```
kubectl create deploy frontend --image=nginx --replicas=3 --dry-run=client -o yaml > frontend.yaml
```
Utworzony w ten sposób manifest zmodyfikowałam dodając do sekcji `spec` wartość `nodeSelector` `node-role: "A"`, aby umieścić tworzone Pod-y na węźle A.
Gotowy manifest został załączony w plikach.

## Deployment backend
```
kubectl create deploy backend --image=nginx --replicas=1 --dry-run=client -o yaml > backend.yaml
```
Utworzony w ten sposób manifest zmodyfikowałam dodając do sekcji `spec` wartość `nodeSelector` `node-role: "B"`, aby umieścić twrzony Pod na węźle B.
Gotowy manifest został załączony w plikach.

## Pod my-sql
```
kubectl run my-sql --image=mysql --env=MYSQL_ROOT_PASSWORD=root --dry-run=client -o yaml > mysql.yaml
```
Tworząc pod nie podałam portu, bo domylnie będzie to 3306. Utworzony w ten sposób manifest zmodyfikowałam dodając do sekcji `spec` wartość `nodeSelector` `node-role: "C"`, aby umieścić utworzony Pod na węźle C. Oprócz tego dodałam etykietę app=my-sql, aby później ruch był poprawnie zarządzany przez NetworkPolicy.
Gotowy manifest został załączony w plikach.

W celu utworzenia powyższych zasobów należy wykonać polecenia `kubectl create -f frontend.yaml`, `kubectl create -f backend.yaml`, `kubectl create -f mysql.yaml`.

```
emilia@wojcik:~/lab8-zad$ kubectl get pods -o wide
NAME                        READY   STATUS    RESTARTS   AGE   IP               NODE            NOMINATED NODE   READINESS GATES
backend-5bbbddcd6d-qlqdf    1/1     Running   0          14m   10.244.234.1     quadruple-m03   <none>           <none>
frontend-7d5d948dff-8gj2c   1/1     Running   0          14m   10.244.243.66    quadruple-m02   <none>           <none>
frontend-7d5d948dff-g5tq5   1/1     Running   0          14m   10.244.243.67    quadruple-m02   <none>           <none>
frontend-7d5d948dff-qjh2c   1/1     Running   0          14m   10.244.243.65    quadruple-m02   <none>           <none>
my-sql                      1/1     Running   0          14m   10.244.239.193   quadruple-m04   <none>           <none>
```
Powyższe polecenie pozwala stwierdzić, że zasoby zostały utworzone poprawnie i na poprawnych węzłach.
# 3. Tworzenie obiektów Service typu NodePort dla Deployment-u frontend
```
kubectl expose deploy frontend --type=NodePort --port=80 --target-port=80 --name=frontend-svc
```
Weryfikuję poprawność utworzenia serwisu:
```
emilia@wojcik:~/lab8-zad$ kubectl get svc 
NAME           TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)        AGE
frontend-svc   NodePort    10.102.28.192   <none>        80:31779/TCP   9m26s
```

# 4. Tworzenie obiektów Service typu ClusterIP dla Deployment-u backend i Pod-a my-sql
## Deployment backend
```kubectl expose deploy backend --type=ClusterIP --port=80 --target-port=80 --name=backend-svc
```
Weryfikuję poprawność utworzenia serwisu:
```
emilia@wojcik:~/lab8-zad$ kubectl get svc 
NAME           TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)        AGE
backend-svc    ClusterIP   10.98.13.167    <none>        80/TCP         6m33s
```
## Pod my-sql
```
kubectl expose pod my-sql --type=ClusterIP --port=3306 --target-port=3306 --name=mysql-svc
```
Weryfikuję poprawność utworzenia serwisu:
```
emilia@wojcik:~/lab8-zad$ kubectl get svc 
NAME           TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)        AGE
mysql-svc      ClusterIP   10.98.127.207   <none>        3306/TCP       56s
```

Wszystkie zasoby działają zgodnie z oczekiwaniami:
```
emilia@wojcik:~/lab8-zad$ kubectl get svc,pod
NAME                   TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)        AGE
service/backend-svc    ClusterIP   10.98.13.167    <none>        80/TCP         16m
service/frontend-svc   NodePort    10.102.28.192   <none>        80:31779/TCP   19m
service/kubernetes     ClusterIP   10.96.0.1       <none>        443/TCP        51m
service/mysql-svc      ClusterIP   10.98.127.207   <none>        3306/TCP       10m

NAME                            READY   STATUS    RESTARTS   AGE
pod/backend-5bbbddcd6d-qlqdf    1/1     Running   0          21m
pod/frontend-7d5d948dff-8gj2c   1/1     Running   0          21m
pod/frontend-7d5d948dff-g5tq5   1/1     Running   0          21m
pod/frontend-7d5d948dff-qjh2c   1/1     Running   0          21m
pod/my-sql                      1/1     Running   0          21m
```

# 5. Opracowanie polityki sieciowej
Na podstawie materiałów załączonych do laboratorium oraz dokumentacji, opracowałam NetworkPolicy:
```                                                   
kind: NetworkPolicy
apiVersion: networking.k8s.io/v1
metadata:
  namespace: default
  name: allow-backend-to-mysql
spec:
  podSelector:
    matchLabels:
      app: my-sql   		#tylko Pod my-sql
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:  
        matchLabels: 
          app: backend 	  	#wpuszcza tylko backend
    ports: 
      - protocol: TCP
        port: 3306		#tylko na port 3306
```
W podSelector wskazuję, jaki pod będzie chroniony (taki, który ma etykietę app: my-sql). Polityka sieciowa ingress oznacza, że kontrolowany będzie tylko ruch przychodzący do my-sql. Następnie w regułach ingress wskazuję, że dopuszczony tylko ruch z Pod-ami z etykietą app: backend i n aport 3306.
Poleceniem `kubectl create -f netpol.yaml` uruchamiam NetworkPolicy na podstawie manifestu.
```
emilia@wojcik:~/lab8-zad$ kubectl get netpol
NAME                     POD-SELECTOR   AGE
allow-backend-to-mysql   app=my-sql     5m49s
```
Polityka sieciowa utworzona zgodnie z oczekiwaniami.


# Sprawdzanie poprawności działania polityki sieciowej
Aby było możliwe wykonanie polecenia wget z Pod-ów, dokonałam instalacji:
```
kubectl exec -it frontend-7d5d948dff-8gj2c -- /bin/sh -c "apt-get update && apt-get install -y wget"
kubectl exec -it backend-5bbbddcd6d-qlqdf -- /bin/sh -c "apt-get update && apt-get install -y wget"
```
### Połączenie frontend do Pod-a my-sql:
```
emilia@wojcik:~/lab8-zad$ kubectl exec -it frontend-7d5d948dff-8gj2c -- wget --spider --timeout=1 mysql-svc:3306
Prepended http:// to 'mysql-svc:3306'
Spider mode enabled. Check if remote file exists.
--2025-11-26 20:47:23--  http://mysql-svc:3306/
Resolving mysql-svc (mysql-svc)... 10.98.127.207
Connecting to mysql-svc (mysql-svc)|10.98.127.207|:3306... failed: Connection timed out.
Retrying.
```
NetworkPolicy działa prawidłowo i zatrzymuje ruch z Pod-ów frontend. Timeout oznacza brak możliwości ustanowienia połączenia. Wielokrotne próby połączenia zawiodły - ręcznie zatrzymałam wykonywanie polecenia.

### Połączenie backend do Pod-a my-sql:
```
emilia@wojcik:~/lab8-zad$ kubectl exec -it backend-5bbbddcd6d-qlqdf -- wget --spider --timeout=1 mysql-svc:3306
Prepended http:// to 'mysql-svc:3306'
Spider mode enabled. Check if remote file exists.
--2025-11-26 21:23:42--  http://mysql-svc:3306/
Resolving mysql-svc (mysql-svc)... 10.98.127.207
Connecting to mysql-svc (mysql-svc)|10.98.127.207|:3306... connected.
```
NetworkPolicy działa prawidłowo i zezwala na ruch z Pod-ów backend. Connecting... connected oznacza, że połączenie zostało nawiązane.