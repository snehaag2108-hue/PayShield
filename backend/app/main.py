from collections import deque
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .schemas import TransactionInput, PolicyUpdate
from .engine import predict, decide, MODEL

app = FastAPI(title='PayShield API', version='0.1.0', description='Hackathon prototype for adaptive fraud decisions. Demo mode is not for real payments.')
app.add_middleware(CORSMiddleware, allow_origins=['http://localhost:5173','http://127.0.0.1:5173'], allow_credentials=True, allow_methods=['*'], allow_headers=['*'])
POLICY = {'friction_budget': 2, 'step_up_cost': 8.0, 'false_block_cost': 40.0, 'verification_success_rate': 0.85}
LOG = deque(maxlen=2000)

@app.get('/health')
def health():
    return {'status':'ok', 'mode':'trained-model' if MODEL else 'demo-heuristic', 'model_version': MODEL.get('version') if MODEL else 'demo-heuristic'}

@app.get('/policy')
def get_policy():
    return POLICY

@app.put('/policy')
def update_policy(update: PolicyUpdate):
    POLICY.update(update.model_dump())
    return {'policy': POLICY, 'message':'Policy updated. Decisions use the new settings immediately.'}

@app.post('/score')
def score(tx: TransactionInput):
    payload = tx.model_dump()
    p, reasons, version = predict(payload)
    result = decide(p, payload['amount'], POLICY['friction_budget'], reasons,
                    POLICY['step_up_cost'], POLICY['false_block_cost'], POLICY['verification_success_rate'], payload.get('anomaly_score'))
    result.update({'transaction_id': payload.get('transaction_id') or f'TXN-{uuid4().hex[:8].upper()}',
                   'amount': payload['amount'], 'fraud_probability': round(p, 4), 'risk_score': round(p*100, 1),
                   'model_version': version, 'mode': 'trained-model' if MODEL else 'demo-heuristic',
                   'timestamp': datetime.now(timezone.utc).isoformat()})
    LOG.appendleft(result)
    return result

@app.post('/simulate')
def simulate(count: int = 300):
    if count < 1 or count > 5000:
        raise HTTPException(400, 'count must be between 1 and 5000')
    import random
    random.seed(42)
    results=[]
    for i in range(count):
        kind = i % 3
        if kind == 0:
            tx = {'amount': random.uniform(100,700), 'hour': random.randint(9,21), 'device_new': False, 'velocity_5m': 1, 'geo_deviation': random.uniform(0,.2), 'customer_avg_amount': 500}
        elif kind == 1:
            tx = {'amount': random.uniform(700,1800), 'hour': random.randint(0,23), 'device_new': True, 'velocity_5m': random.randint(2,4), 'geo_deviation': random.uniform(.25,.65), 'customer_avg_amount': 500}
        else:
            tx = {'amount': random.uniform(1800,8000), 'hour': random.randint(0,5), 'device_new': True, 'velocity_5m': random.randint(5,10), 'geo_deviation': random.uniform(.7,1), 'customer_avg_amount': 500}
        p, reasons, version = predict(tx)
        d = decide(p, tx['amount'], POLICY['friction_budget'], reasons, POLICY['step_up_cost'], POLICY['false_block_cost'], POLICY['verification_success_rate'])
        results.append({'transaction_id':f'SIM-{i+1:05d}', 'amount':round(tx['amount'],2), 'fraud_probability':round(p,4), 'action':d['action'], 'risk_factors':d['risk_factors'], 'model_version':version})
    for r in reversed(results): LOG.appendleft(r)
    total=len(results)
    return {'count':total, 'actions':{a:sum(r['action']==a for r in results) for a in ['ALLOW','STEP-UP','BLOCK']},
            'average_risk':round(sum(r['fraud_probability'] for r in results)/total*100,1),
            'estimated_blocked_amount':round(sum(r['amount'] for r in results if r['action']=='BLOCK'),2),
            'transactions':results[:100], 'mode':'trained-model' if MODEL else 'demo-heuristic',
            'notice':'Simulated results; not real-world performance.'}

@app.get('/metrics')
def metrics():
    items=list(LOG)
    return {'logged_transactions':len(items), 'actions':{a:sum(x.get('action')==a for x in items) for a in ['ALLOW','STEP-UP','BLOCK']},
            'recent_transactions':items[:100], 'mode':'trained-model' if MODEL else 'demo-heuristic',
            'notice':'These are application/demo counters, not a labelled evaluation.'}
