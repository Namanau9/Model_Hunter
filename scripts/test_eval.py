import sys
sys.path.insert(0, 'F:/MH/scripts')
from run_experiments import run_attack_evaluation
from app.utils.device import get_device, reset_device_cache
from app.utils.logging import configure_logging

configure_logging()
reset_device_cache()
device = get_device()
print(f"Device: {device}")

ckpt = 'F:/MH/pretrained_models/cnn_mnist_full.pth'

# Quick CW test - should be fast on CNN
import time
t0 = time.time()
atk = run_attack_evaluation('cnn', 'mnist', ckpt, 'cw', 0.1, str(device))
print(f"CW time: {time.time()-t0:.1f}s")
print(f"  ASR={atk['attack_success_rate']}% drop={atk['accuracy_drop']}%")
print(f"  eps_violated: {atk['perturbation_stats']['epsilon_violated']}")
print(f"  n_samples: {atk['n_samples']}")

# Quick ZOO test
t0 = time.time()
atk2 = run_attack_evaluation('cnn', 'mnist', ckpt, 'zoo', 0.1, str(device))
print(f"ZOO time: {time.time()-t0:.1f}s")
print(f"  ASR={atk2['attack_success_rate']}% drop={atk2['accuracy_drop']}%")

# Quick HSJ test
t0 = time.time()
atk3 = run_attack_evaluation('cnn', 'mnist', ckpt, 'hopskipjump', 0.1, str(device))
print(f"HSJ time: {time.time()-t0:.1f}s")
print(f"  ASR={atk3['attack_success_rate']}% drop={atk3['accuracy_drop']}%")
