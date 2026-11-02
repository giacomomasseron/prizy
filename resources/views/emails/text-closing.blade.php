@foreach ($steps as $step)
{{ $loop->iteration }}. {!! $step['title'].$step['rest'] !!}
@endforeach

@if ($onPrizyCloud)
See you inside,
The Prizy team
@else
See you inside.
@endif
