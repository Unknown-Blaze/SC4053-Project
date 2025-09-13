import random
import threading
import time
from queue import Queue
from secrets import SystemRandom

from sympy.polys.polyfuncs import interpolate


class ShamirSecretScheme:
    def __init__(self):
        self.rng = SystemRandom()
        self.n = 3
        self.k = 2
        self.milestone_secret = 15
        self.attestation_queue = Queue()

    def _generate_shares(
        self, secret, num_shares, threshold, prime
    ) -> list((int, int)):
        coefficients = [secret] + [
            self.rng.randint(1, prime - 1) for _ in range(threshold - 1)
        ]

        return [
            (i + 1, sum(c * (i + 1) ** j for j, c in enumerate(coefficients)))
            for i in range(num_shares)
        ]

    def _interpolate_secret(self, minimum_shares) -> int:
        secret = interpolate(minimum_shares, 0)
        return secret

    def _verfier_node(node_id, share, queue):
        """
        Simulates an independent verifier node:
        - Sleeps a random time to simulate processing.
        - 'Attests' by putting its share and timestamp into the queue.
        """
        # Simulate variable verification time
        time.sleep(random.uniform(0.1, 3.0))

        # Simulate timestamp (Unix time)
        timestamp = time.time()
        queue.put((node_id, share, timestamp))
        print(
            f"Node {node_id} attested at {time.strftime('%X', time.localtime(timestamp))}"
        )

    def verify(self, current):
        threads = []
        shares = self._generate_shares(self.milestone_secret, self.n, self.k, 7)
        print(shares)
        for i, share in enumerate(shares, start=1):
            t = threading.Thread(
                target=self._verifier_node, args=(i, share, self.attestation_queue)
            )
            t.start()
            threads.append(t)

        collected_shares = []
        collected_ids = set()

        while len(collected_shares) < self.k:
            node_id, share, timestamp = self.attestation_queue.get()
            if node_id not in collected_ids:
                collected_ids.add(node_id)
                collected_shares.append(share)

        for t in threads:
            t.join()

        recovered = self._interpolate_secret(collected_shares[: self.k])

        if recovered == current:
            return True
        else:
            return False
