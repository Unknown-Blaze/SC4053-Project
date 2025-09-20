## Set-up Instructions

1) Setup Virtual Env
```
python3 -m venv env
source env/bin/activate
pip install -r requirements.txt
```

2) Setup Package
```
pip install -e .
```

3) Setup Backend
In another terminal, set-up the backend by running `uvicorn main:app --reload`.
